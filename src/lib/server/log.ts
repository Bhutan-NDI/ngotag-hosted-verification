import "server-only";
import { config } from "./config";

type Level = "debug" | "info" | "warn" | "error";
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function emit(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (order[level] < order[config.logLevel]) return;
  const err = fields?.err;
  const line = {
    time: new Date().toISOString(),
    level,
    msg,
    ...fields,
    ...(err instanceof Error ? { err: { name: err.name, message: err.message, stack: err.stack } } : {}),
  };
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

/** Structured JSON logs (one line per event). Never log secrets or attributes. */
export const log = {
  debug: (msg: string, f?: Record<string, unknown>) => emit("debug", msg, f),
  info: (msg: string, f?: Record<string, unknown>) => emit("info", msg, f),
  warn: (msg: string, f?: Record<string, unknown>) => emit("warn", msg, f),
  error: (msg: string, f?: Record<string, unknown>) => emit("error", msg, f),
};
