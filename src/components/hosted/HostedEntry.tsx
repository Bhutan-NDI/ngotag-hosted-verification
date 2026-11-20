"use client";

import { useEffect, useState } from "react";
import { isHostedId } from "@/lib/platform";
import { loadConfig } from "@/lib/runtimeConfig";
import type { DeviceMode } from "@/lib/types";
import { HostedFlow } from "./HostedFlow";
import { Frame, StateView } from "./views";

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i;
const CONFIG_RETRY_MS = 3000;

type Entry =
  | { kind: "starting" }
  | { kind: "not-found"; mode: DeviceMode }
  | { kind: "no-config"; mode: DeviceMode }
  | { kind: "ready"; hostedId: string; mode: DeviceMode; apiBaseUrl: string };

/** hostedId from /v/<hostedId>: the only input read from the URL (DL-003, AC 4). */
function hostedIdFromPath(pathname: string): string {
  const [, segment = ""] = pathname.split("/").filter(Boolean);
  try {
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

/**
 * Phone or laptop, decided in the browser; ?mode=web|mobile overrides it. The page always offers
 * both paths, so a wrong guess is never a dead end (HVP-SD §5.6).
 */
function deviceMode(): DeviceMode {
  const forced = new URLSearchParams(window.location.search).get("mode");
  if (forced === "web" || forced === "mobile") return forced;
  const ua = navigator.userAgent;
  const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return MOBILE_UA.test(ua) || iPadOs ? "mobile" : "web";
}

/** Static entry: reads the URL and /config.json in the browser, then starts the flow. */
export function HostedEntry() {
  const [entry, setEntry] = useState<Entry>({ kind: "starting" });

  useEffect(() => {
    const mode = deviceMode();
    const hostedId = hostedIdFromPath(window.location.pathname);
    if (!isHostedId(hostedId)) {
      setEntry({ kind: "not-found", mode });
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const start = () =>
      loadConfig().then(
        ({ platformApiUrl }) => !cancelled && setEntry({ kind: "ready", hostedId, mode, apiBaseUrl: platformApiUrl }),
        () => {
          if (cancelled) return;
          setEntry({ kind: "no-config", mode });
          timer = setTimeout(start, CONFIG_RETRY_MS);
        },
      );
    start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (entry.kind === "ready") {
    const { hostedId, mode, apiBaseUrl } = entry;
    return <HostedFlow key={`${hostedId}-${mode}`} hostedId={hostedId} mode={mode} apiBaseUrl={apiBaseUrl} />;
  }
  const mode = entry.kind === "starting" ? "mobile" : entry.mode;
  const view = entry.kind === "not-found" ? "not-found" : entry.kind === "no-config" ? "reconnecting" : "loading";
  return (
    <Frame mode={mode}>
      <StateView view={view} mode={mode} />
    </Frame>
  );
}
