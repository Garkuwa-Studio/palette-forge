import type { PixelSource, RGB } from "../src/types.js";
import { fromHex } from "../src/color/convert.js";

/**
 * Build a synthetic image from colour bands with explicit proportions.
 *
 * Using generated images rather than fixtures keeps the expected palette
 * knowable exactly: if you ask for 60% red, the extractor had better report
 * something very close to 60% red.
 */
export function makeImage(
  bands: Array<{ color: string; weight: number }>,
  width = 100,
  height = 100,
): PixelSource {
  const total = bands.reduce((sum, b) => sum + b.weight, 0);
  const data = new Uint8ClampedArray(width * height * 4);
  const pixels = width * height;

  let cursor = 0;
  bands.forEach((band, index) => {
    const [r, g, b] = fromHex(band.color);
    // Last band absorbs the rounding remainder so the image is fully painted.
    const count =
      index === bands.length - 1
        ? pixels - cursor
        : Math.round((band.weight / total) * pixels);

    for (let i = 0; i < count && cursor < pixels; i++, cursor++) {
      const o = cursor * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
  });

  return { data, width, height };
}

/** A solid single-colour image. */
export function solid(color: string, width = 32, height = 32): PixelSource {
  return makeImage([{ color, weight: 1 }], width, height);
}

/** Image with a fully transparent region, to exercise the alpha threshold. */
export function withTransparency(color: string, opaqueFraction: number): PixelSource {
  const width = 40;
  const height = 40;
  const data = new Uint8ClampedArray(width * height * 4);
  const [r, g, b] = fromHex(color);
  const pixels = width * height;
  const opaque = Math.round(pixels * opaqueFraction);

  for (let i = 0; i < pixels; i++) {
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = i < opaque ? 255 : 0;
  }
  return { data, width, height };
}

/** Max absolute per-channel difference between two colours. */
export function channelDelta(a: RGB, b: RGB): number {
  return Math.max(...a.map((c, i) => Math.abs(c - b[i]!)));
}
