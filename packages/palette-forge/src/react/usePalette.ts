"use client";

/**
 * The hook the demo app is built on.
 *
 * The important design decision is that the decoded `PixelSource` is cached
 * separately from the palette. Re-clustering is milliseconds; decoding and
 * rasterising an image is not. Keeping them apart is what lets a colour-count
 * slider re-extract on every frame without touching the decoder.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractPalette } from "../extract.js";
import { toPixelSource, type ImageInput } from "../browser.js";
import type { ExtractOptions, Palette, PixelSource } from "../types.js";

export type PaletteStatus = "idle" | "loading" | "ready" | "error";

export interface UsePaletteResult {
  palette: Palette | null;
  status: PaletteStatus;
  error: Error | null;
  /** Object URL for the loaded image, render it as a preview. Revoked on reset. */
  preview: string | null;
  /** Decoded pixels, retained so option changes re-cluster without re-decoding. */
  source: PixelSource | null;
  /** Decode and extract. Safe to call repeatedly; stale loads are discarded. */
  load: (input: ImageInput) => Promise<void>;
  /** Re-run clustering on the cached pixels. Called automatically on option change. */
  reextract: () => void;
  /** Drop the image, palette and preview. */
  reset: () => void;
}

export function usePalette(options: ExtractOptions = {}): UsePaletteResult {
  const [palette, setPalette] = useState<Palette | null>(null);
  const [status, setStatus] = useState<PaletteStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [source, setSource] = useState<PixelSource | null>(null);

  /** Monotonic token so a slow first load can't overwrite a fast second one. */
  const loadToken = useRef(0);
  const previewRef = useRef<string | null>(null);

  // Depend on the option *values*, not the object identity, callers routinely
  // pass an inline object literal, which would otherwise re-extract every render.
  const optionKey = JSON.stringify(options);
  const stableOptions = useMemo<ExtractOptions>(() => JSON.parse(optionKey), [optionKey]);

  const releasePreview = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
  }, []);

  const load = useCallback(
    async (input: ImageInput) => {
      const token = ++loadToken.current;
      setStatus("loading");
      setError(null);

      try {
        const pixels = await toPixelSource(input);
        if (token !== loadToken.current) return; // Superseded by a newer load.

        releasePreview();
        if (typeof Blob !== "undefined" && input instanceof Blob) {
          const url = URL.createObjectURL(input);
          previewRef.current = url;
          setPreview(url);
        } else if (typeof input === "string") {
          setPreview(input);
        } else {
          setPreview(null);
        }

        // Clustering is left to the effect below, which already re-runs on any
        // source change. Doing it here too would extract twice per image.
        setSource(pixels);
      } catch (cause) {
        if (token !== loadToken.current) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setStatus("error");
      }
    },
    [stableOptions, releasePreview],
  );

  const reextract = useCallback(() => {
    if (!source) return;
    try {
      setPalette(extractPalette(source, stableOptions));
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error(String(cause)));
      setStatus("error");
    }
  }, [source, stableOptions]);

  const reset = useCallback(() => {
    loadToken.current++;
    releasePreview();
    setPalette(null);
    setSource(null);
    setPreview(null);
    setError(null);
    setStatus("idle");
  }, [releasePreview]);

  // Re-cluster whenever the options change, reusing the decoded pixels.
  useEffect(() => {
    if (source) reextract();
    // `reextract` already closes over `source` and the options.
  }, [source, stableOptions, reextract]);

  // Don't leak the object URL if the component unmounts mid-session.
  useEffect(() => releasePreview, [releasePreview]);

  return { palette, status, error, preview, source, load, reextract, reset };
}
