/**
 * The main entry point: pixels in, named and scored palette out.
 */

import { bestTextColor, relativeLuminance } from "./color/contrast.js";
import { rgbToHsl, rgbToOklch, toHex } from "./color/convert.js";
import { kmeans } from "./quantize/kmeans.js";
import { samplePixels } from "./quantize/sample.js";
import { assignRoles, nameSwatches, type RoleCandidate } from "./roles.js";
import type { ExtractOptions, Palette, RGB, Role, Swatch } from "./types.js";

/** Defaults, exported so callers can introspect or extend them. */
export const DEFAULT_OPTIONS = {
  colors: 6,
  maxDimension: 160,
  space: "oklab",
  maxIterations: 24,
  seed: 0x5eed,
  downweightNeutrals: false,
  alphaThreshold: 125,
  minShare: 0.004,
} as const satisfies Required<ExtractOptions>;

/** Hard ceiling on `colors`. Beyond this, clusters are noise, not palette. */
const MAX_COLORS = 24;

/**
 * Extract a palette from raw RGBA pixels.
 *
 * Synchronous and pure: the same `source` and `options` always produce the same
 * `Palette`, which makes it safe to memoise and straightforward to test. Accepts
 * anything shaped like `ImageData`, so a browser canvas, a Node decode result,
 * or a hand-built buffer all work.
 *
 * @example Browser
 * const ctx = canvas.getContext("2d");
 * const palette = extractPalette(ctx.getImageData(0, 0, canvas.width, canvas.height));
 * palette.swatches[0].hex; // "#4cc9f0"
 *
 * @example Pull out the brand colour specifically
 * const [primary] = palette.byRole.primary ?? [];
 */
export function extractPalette(
  source: { data: Uint8ClampedArray | Uint8Array; width: number; height: number },
  options: ExtractOptions = {},
): Palette {
  const startedAt = now();

  const colors = Math.max(1, Math.min(MAX_COLORS, Math.round(options.colors ?? DEFAULT_OPTIONS.colors)));
  const resolved = {
    colors,
    maxDimension: Math.max(16, options.maxDimension ?? DEFAULT_OPTIONS.maxDimension),
    space: options.space ?? DEFAULT_OPTIONS.space,
    maxIterations: Math.max(1, options.maxIterations ?? DEFAULT_OPTIONS.maxIterations),
    seed: options.seed ?? DEFAULT_OPTIONS.seed,
    downweightNeutrals: options.downweightNeutrals ?? DEFAULT_OPTIONS.downweightNeutrals,
    alphaThreshold: options.alphaThreshold ?? DEFAULT_OPTIONS.alphaThreshold,
    minShare: options.minShare ?? DEFAULT_OPTIONS.minShare,
  };

  const sample = samplePixels(source, {
    maxDimension: resolved.maxDimension,
    space: resolved.space,
    downweightNeutrals: resolved.downweightNeutrals,
    alphaThreshold: resolved.alphaThreshold,
  });

  const { clusters, iterations } = kmeans(sample, {
    k: resolved.colors,
    maxIterations: resolved.maxIterations,
    seed: resolved.seed,
    minShare: resolved.minShare,
  });

  // Snap each cluster to its medoid. A colour that genuinely occurs in the
  // image, so a flat logo yields its exact brand hex rather than a mean that
  // lands a shade or two off.
  const merged = mergeByHex(
    clusters.map((c) => ({ rgb: c.medoidRgb as RGB, share: c.share })),
  );

  const candidates: RoleCandidate[] = merged.map((c) => ({
    rgb: c.rgb,
    oklch: rgbToOklch(c.rgb),
    share: c.share,
  }));

  const roles = assignRoles(candidates);
  const names = nameSwatches(roles);

  const swatches: Swatch[] = candidates.map((candidate, i) => ({
    hex: toHex(candidate.rgb),
    rgb: [
      Math.round(candidate.rgb[0]),
      Math.round(candidate.rgb[1]),
      Math.round(candidate.rgb[2]),
    ] as RGB,
    hsl: rgbToHsl(candidate.rgb),
    oklch: candidate.oklch,
    share: candidate.share,
    role: roles[i]!,
    name: names[i]!,
    luminance: relativeLuminance(candidate.rgb),
    on: bestTextColor(candidate.rgb),
  }));

  const byRole: Partial<Record<Role, Swatch[]>> = {};
  for (const swatch of swatches) {
    (byRole[swatch.role] ??= []).push(swatch);
  }

  return {
    swatches,
    byRole,
    meta: {
      pixelsSampled: sample.pixelsSampled,
      sampledWidth: sample.sampledWidth,
      sampledHeight: sample.sampledHeight,
      iterations,
      requestedColors: resolved.colors,
      space: resolved.space,
      seed: resolved.seed,
      durationMs: Math.round((now() - startedAt) * 100) / 100,
    },
  };
}

/**
 * Fold clusters that snapped to the same hex, summing their coverage.
 *
 * Two clusters landing on one colour is expected when `colors` exceeds the
 * number of distinct colours in the image. A two-tone logo asked for eight
 * swatches. Emitting the same hex twice would produce duplicate CSS variables.
 */
function mergeByHex(entries: Array<{ rgb: RGB; share: number }>): Array<{ rgb: RGB; share: number }> {
  const byHex = new Map<string, { rgb: RGB; share: number }>();
  for (const entry of entries) {
    const hex = toHex(entry.rgb);
    const existing = byHex.get(hex);
    if (existing) existing.share += entry.share;
    else byHex.set(hex, { rgb: entry.rgb, share: entry.share });
  }
  return [...byHex.values()].sort((a, b) => b.share - a.share);
}

/** `performance.now()` where available, else `Date.now()`. */
function now(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}
