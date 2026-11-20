import { HostedEntry } from "@/components/hosted/HostedEntry";

/**
 * The hosted page: one static entry file (out/v/_.html). The CDN rewrites every /v/<hostedId>
 * to it (DL-018); the browser reads the real hostedId from the URL (DL-003).
 */
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function HostedPage() {
  return <HostedEntry />;
}
