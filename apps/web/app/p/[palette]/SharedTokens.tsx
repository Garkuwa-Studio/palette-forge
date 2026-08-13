"use client";

import type { Palette } from "palette-forge";
import { ToastProvider } from "@/components/Toast";
import { TokenOutput } from "@/components/TokenOutput";

/**
 * The token panel needs the toast context, which the shared-palette page (a
 * server component) doesn't otherwise provide. Wrapping here keeps the rest of
 * that page server-rendered.
 */
export function SharedTokens({ palette }: { palette: Palette }) {
  return (
    <ToastProvider>
      <TokenOutput palette={palette} />
    </ToastProvider>
  );
}
