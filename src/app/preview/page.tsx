import { notFound } from "next/navigation";
import { PreviewGallery } from "@/components/hosted/PreviewGallery";
import { config } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/** Design QA gallery. Disabled in production unless ENABLE_PREVIEW=true. */
export default function PreviewPage() {
  if (!config.previewEnabled) notFound();
  return <PreviewGallery />;
}
