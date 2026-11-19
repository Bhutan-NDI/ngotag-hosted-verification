"use client";

import { StateView, Frame } from "@/components/hosted/views";

export default function NotFound() {
  return (
    <Frame>
      <StateView view="not-found" mode="web" />
    </Frame>
  );
}
