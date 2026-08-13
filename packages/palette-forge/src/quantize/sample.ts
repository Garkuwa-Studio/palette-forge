/**
 * Turning raw RGBA bytes into weighted points for the clusterer.
 *
 * Two decisions matter here:
 *
 * 1. **Stride sampling, not averaging.** Downscaling with a box filter invents
 *    colours that were never in the image, average a red logo on white and you
 *    get pink, which then shows up in the palette as a "brand colour". Taking
 *    every Nth pixel keeps every sample a colour that genuinely occurred.
 *
 * 2. **Deduplicate into weights.** Flat-colour art (logos, UI screenshots, most
 *    of what gets dropped on this tool) collapses from tens of thousands of
 *    pixels to a few hundred unique colours. k-means then runs on the unique
 *    set with occurrence counts as weights, mathematically identical, an order
 *    of magnitude faster.
 */

import type { ColorSpace, ExtractOptions, PixelSource } from "../types.js";
import { rgbToHsl, rgbToLab, rgbToOklab } from "../color/convert.js";

export interface SampledPixels {
  /** Perceptual coordinates, `count * 3`, interleaved. */
  coords: Float64Array;
  /** Source sRGB 0 to 255, `count * 3`, interleaved. */
  rgb: Float64Array;
  /** Weight per unique colour: occurrences, times any neutral penalty. */
  weights: Float64Array;
  /** Number of unique colours retained. */
  count: number;
  totalWeight: number;
  /** Opaque pixels actually visited (before dedupe). */
  pixelsSampled: number;
  sampledWidth: number;
  sampledHeight: number;
}

/**
 * Weight applied to greys and near-black/near-white pixels when
 * `downweightNeutrals` is on.
 *
 * These are not dropped outright: a UI screenshot really is mostly white, and a
 * palette that pretends otherwise is lying about the design. They are demoted so
 * a logo occupying 3% of a screenshot can still win a cluster.
 */
function neutralWeight(rgb: readonly [number, number, number]): number {
  const [, s, l] = rgbToHsl(rgb);
  if (l > 96 || l < 4) return 0.08; // Paper white / true black.
  if (s < 10) return 0.18; // Greys.
  return 1;
}

export function samplePixels(
  source: PixelSource,
  options: Required<Pick<ExtractOptions, "maxDimension" | "space" | "downweightNeutrals" | "alphaThreshold">>,
): SampledPixels {
  const { maxDimension, space, downweightNeutrals, alphaThreshold } = options;
  const { data, width, height } = source;

  if (width <= 0 || height <= 0) {
    throw new RangeError(`Image has no area: ${width}×${height}`);
  }
  const expected = width * height * 4;
  if (data.length < expected) {
    throw new RangeError(
      `Pixel buffer too small: got ${data.length} bytes, need ${expected} for ${width}×${height} RGBA`,
    );
  }

  // One stride for both axes preserves the aspect ratio of what we sample.
  const stride = Math.max(1, Math.ceil(Math.max(width, height) / maxDimension));
  const sampledWidth = Math.ceil(width / stride);
  const sampledHeight = Math.ceil(height / stride);

  const convert = space === "lab" ? rgbToLab : rgbToOklab;

  // Key is a packed 24-bit RGB, so exact colours merge with no precision loss.
  const buckets = new Map<number, number>();
  let pixelsSampled = 0;

  for (let y = 0; y < height; y += stride) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x += stride) {
      const i = (rowOffset + x) * 4;
      if (data[i + 3]! < alphaThreshold) continue;
      const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
      pixelsSampled++;
    }
  }

  const count = buckets.size;
  const coords = new Float64Array(count * 3);
  const rgb = new Float64Array(count * 3);
  const weights = new Float64Array(count);

  let index = 0;
  let totalWeight = 0;
  for (const [key, occurrences] of buckets) {
    const r = (key >> 16) & 0xff;
    const g = (key >> 8) & 0xff;
    const b = key & 0xff;
    const triple = [r, g, b] as const;

    const weight = downweightNeutrals
      ? occurrences * neutralWeight(triple)
      : occurrences;

    const c = convert(triple);
    const o = index * 3;
    coords[o] = c[0];
    coords[o + 1] = c[1];
    coords[o + 2] = c[2];
    rgb[o] = r;
    rgb[o + 1] = g;
    rgb[o + 2] = b;
    weights[index] = weight;
    totalWeight += weight;
    index++;
  }

  return {
    coords,
    rgb,
    weights,
    count,
    totalWeight,
    pixelsSampled,
    sampledWidth,
    sampledHeight,
  };
}

/** Re-export so callers can name the space without importing conversion internals. */
export type { ColorSpace };
