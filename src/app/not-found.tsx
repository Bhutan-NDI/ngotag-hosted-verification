"use client";

import { StateView, Frame } from "@/components/hosted/views";

export default function NotFound() {
  return (
    <Frame mode="web">
      <StateView view="not-found" mode="web" />
    </Frame>
  );
}
