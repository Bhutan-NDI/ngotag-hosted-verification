import { notFound } from "next/navigation";
import { PreviewGallery } from "@/components/hosted/PreviewGallery";
import { config } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/** Design QA gallery: every screen, phone and web. Only with the mock platform (dev). */
export default function PreviewPage() {
  if (!config.mockPlatform) notFound();
  return <PreviewGallery />;
}
