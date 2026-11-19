import "server-only";
import { EventEmitter } from "node:events";
import Redis from "ioredis";
import type { SessionStatus } from "@/lib/types";
import { config, type ProofAttribute } from "./config";
import { log } from "./log";

export interface Session {
  id: string;
  /** Incremented on every write; used for compare-and-set. */
  version: number;
  status: SessionStatus;
  partnerId: string;
  partnerName: string;
  redirectUri: string;
  /** Opaque value from the partner, echoed back on redirect (CSRF protection). */
  state?: string;
  proofName: string;
  proofAttributes: ProofAttribute[];

  threadId?: string;
  proofRequestURL?: string;
  deepLinkURL?: string;

  createdAt: number;
  /** Hard end of the session; after this it is treated as not found. */
  sessionExpiresAt: number;
  proofExpiresAt?: number;
  scannedAt?: number;

  /** Revealed attributes once verified (only exposed to the partner API). */
  result?: Record<string, unknown>;
  /** Outcome reported back to the partner when the user leaves. */
  outcome?: SessionStatus;
}

/** Return the new session, or null to leave it unchanged. */
export type Mutator = (current: Session) => Session | null;

export interface Store {
  get(id: string): Promise<Session | undefined>;
  idForThread(threadId: string): Promise<string | undefined>;
  create(s: Session): Promise<void>;
  /** Atomic read-modify-write. Returns the stored session afterwards. */
  update(id: string, fn: Mutator): Promise<Session | undefined>;
  subscribe(id: string, fn: (s: Session) => void): Promise<() => void>;
  /** Fixed-window limiter. Returns true if the call is allowed. */
  hit(key: string, limit: number, windowMs: number): Promise<boolean>;
  ping(): Promise<boolean>;
}

/** Keep records a while after the session ends so late lookups still resolve. */
const retentionMs = (s: Session) => Math.max(s.sessionExpiresAt - Date.now(), 0) + 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// In-memory (development / single process only)
// ---------------------------------------------------------------------------

class MemoryStore implements Store {
  private sessions = new Map<string, Session>();
  private threads = new Map<string, string>();
  private hits = new Map<string, { n: number; resetAt: number }>();
  private events = new EventEmitter().setMaxListeners(0);

  private save(s: Session) {
    this.sessions.set(s.id, s);
    if (s.threadId) this.threads.set(s.threadId, s.id);
    this.events.emit(s.id, s);
    this.sweep();
  }

  private sweep() {
    if (Math.random() > 0.05) return;
    const now = Date.now();
    for (const [id, s] of this.sessions) {
      if (now > s.sessionExpiresAt + 60 * 60 * 1000) {
        this.sessions.delete(id);
        if (s.threadId) this.threads.delete(s.threadId);
      }
    }
    for (const [k, v] of this.hits) if (now > v.resetAt) this.hits.delete(k);
  }

  async get(id: string) {
    return this.sessions.get(id);
  }
  async idForThread(threadId: string) {
    return this.threads.get(threadId);
  }
  async create(s: Session) {
    this.save(s);
  }
  async update(id: string, fn: Mutator) {
    const cur = this.sessions.get(id);
    if (!cur) return undefined;
    const next = fn(cur);
    if (!next) return cur;
    const saved = { ...next, version: cur.version + 1 };
    this.save(saved);
    return saved;
  }
  async subscribe(id: string, fn: (s: Session) => void) {
    this.events.on(id, fn);
    return () => {
      this.events.off(id, fn);
    };
  }
  async hit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const cur = this.hits.get(key);
    if (!cur || now > cur.resetAt) {
      this.hits.set(key, { n: 1, resetAt: now + windowMs });
      return true;
    }
    cur.n += 1;
    return cur.n <= limit;
  }
  async ping() {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Redis (production: shared across instances, survives restarts)
// ---------------------------------------------------------------------------

const K = {
  session: (id: string) => `ndi:session:${id}`,
  thread: (t: string) => `ndi:thread:${t}`,
  channel: (id: string) => `ndi:events:${id}`,
  rate: (k: string) => `ndi:rl:${k}`,
};

/** SET only if the stored version matches; publish the new value. */
const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
local expected = tonumber(ARGV[2])
if cur then
  if cjson.decode(cur).version ~= expected then return 0 end
elseif expected ~= -1 then
  return 0
end
redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[3])
redis.call('PUBLISH', KEYS[2], ARGV[1])
return 1
`;

class RedisStore implements Store {
  private cmd: Redis;
  private sub: Redis;
  private listeners = new Map<string, Set<(s: Session) => void>>();

  constructor(url: string) {
    const opts = { maxRetriesPerRequest: 3, enableReadyCheck: true, lazyConnect: false };
    this.cmd = new Redis(url, opts);
    this.sub = new Redis(url, opts);
    this.cmd.on("error", (err) => log.error("redis error", { err }));
    this.sub.on("error", (err) => log.error("redis subscriber error", { err }));
    this.sub.on("message", (channel: string, message: string) => {
      const set = this.listeners.get(channel);
      if (!set) return;
      let s: Session;
      try {
        s = JSON.parse(message) as Session;
      } catch {
        return;
      }
      for (const fn of set) fn(s);
    });
  }

  private async cas(s: Session, expected: number) {
    const ok = await this.cmd.eval(
      CAS_SCRIPT,
      2,
      K.session(s.id),
      K.channel(s.id),
      JSON.stringify(s),
      String(expected),
      String(retentionMs(s)),
    );
    if (ok === 1 && s.threadId) {
      await this.cmd.set(K.thread(s.threadId), s.id, "PX", retentionMs(s));
    }
    return ok === 1;
  }

  async get(id: string) {
    const raw = await this.cmd.get(K.session(id));
    return raw ? (JSON.parse(raw) as Session) : undefined;
  }
  async idForThread(threadId: string) {
    return (await this.cmd.get(K.thread(threadId))) ?? undefined;
  }
  async create(s: Session) {
    if (!(await this.cas(s, -1))) throw new Error("session id collision");
  }
  async update(id: string, fn: Mutator) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const cur = await this.get(id);
      if (!cur) return undefined;
      const next = fn(cur);
      if (!next) return cur;
      const saved = { ...next, version: cur.version + 1 };
      if (await this.cas(saved, cur.version)) return saved;
    }
    throw new Error(`session ${id}: too much write contention`);
  }
  async subscribe(id: string, fn: (s: Session) => void) {
    const ch = K.channel(id);
    let set = this.listeners.get(ch);
    if (!set) {
      set = new Set();
      this.listeners.set(ch, set);
      await this.sub.subscribe(ch);
    }
    set.add(fn);
    return () => {
      const s = this.listeners.get(ch);
      if (!s) return;
      s.delete(fn);
      if (s.size === 0) {
        this.listeners.delete(ch);
        this.sub.unsubscribe(ch).catch(() => {});
      }
    };
  }
  async hit(key: string, limit: number, windowMs: number) {
    const k = K.rate(key);
    // SET NX starts a window with its expiry; INCR counts within it (Redis 6+).
    const res = (await this.cmd.multi().set(k, 0, "PX", windowMs, "NX").incr(k).exec()) ?? [];
    const n = Number(res[1]?.[1] ?? 0);
    return n <= limit;
  }
  async ping() {
    try {
      return (await this.cmd.ping()) === "PONG";
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------

const g = globalThis as unknown as { __ndiStore?: Store };

export function store(): Store {
  if (!g.__ndiStore) {
    if (config.redisUrl) {
      g.__ndiStore = new RedisStore(config.redisUrl);
      log.info("session store: redis");
    } else {
      g.__ndiStore = new MemoryStore();
      log.warn("session store: in-memory (single process only — set REDIS_URL for production)");
    }
  }
  return g.__ndiStore;
}
