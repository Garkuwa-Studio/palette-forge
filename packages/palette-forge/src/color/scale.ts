/**
 * Tonal scale generation.
 *
 * A single extracted brand colour is not a design system, shipping one means
 * having a ramp behind it (hover states, borders, muted backgrounds). These
 * ramps are built in OKLCH so each step is a genuine perceptual increment: the
 * naive approach of scaling HSL lightness produces ramps that look washed out in
 * the yellows and muddy in the blues, because HSL lightness is not perceptual.
 */

import type { OKLCH, RGB, ToneScale, ToneStop } from "../types.js";
import { fromHex, rgbToOklch, toHex } from "./convert.js";
import { oklchToRgbClipped } from "./gamut.js";

export const TONE_STOPS: readonly ToneStop[] = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

/**
 * Target OKLab lightness per stop. Tuned to sit close to the ramps shipped by
 * Tailwind v4 and Radix, so generated scales drop into an existing system
 * without visually clashing with the greys already there.
 */
const LIGHTNESS: Record<ToneStop, number> = {
  50: 0.971,
  100: 0.936,
  200: 0.885,
  300: 0.808,
  400: 0.704,
  500: 0.637,
  600: 0.577,
  700: 0.505,
  800: 0.444,
  900: 0.396,
  950: 0.261,
};

/**
 * Chroma multiplier per stop, relative to the base colour's chroma. Peaks in the
 * 500 to 600 range and tapers at both ends, which mirrors how saturated colour
 * behaves near white and black, and is also simply where the gamut runs out.
 */
const CHROMA_FACTOR: Record<ToneStop, number> = {
  50: 0.16,
  100: 0.28,
  200: 0.48,
  300: 0.72,
  400: 0.92,
  500: 1.0,
  600: 1.0,
  700: 0.94,
  800: 0.82,
  900: 0.7,
  950: 0.52,
};

export interface ScaleOptions {
  /**
   * Pin the input colour verbatim at its nearest stop, so the brand colour you
   * extracted is literally present in the ramp rather than merely approximated.
   * Default `true`.
   */
  anchor?: boolean;
  /**
   * Multiply all chroma by this. Below 1 gives a muted, "editorial" ramp; above
   * 1 pushes toward the gamut edge. Default `1`.
   */
  saturation?: number;
  /**
   * Degrees of hue rotation applied across the ramp, light end to dark end.
   * A small negative value (e.g. `-8`) mimics how pigments cool as they darken
   * and often reads as more natural. Default `0`.
   */
  hueShift?: number;
}

/** The stop whose target lightness is nearest this colour's. */
export function nearestStop(color: string | RGB): ToneStop {
  const rgb = typeof color === "string" ? fromHex(color) : color;
  const l = rgbToOklch(rgb)[0];
  let best: ToneStop = 500;
  let bestDelta = Infinity;
  for (const stop of TONE_STOPS) {
    const delta = Math.abs(LIGHTNESS[stop] - l);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = stop;
    }
  }
  return best;
}

/**
 * Build an 11-stop tonal ramp (50 to 950) from one colour.
 *
 * @example
 * scale("#4cc9f0")
 * // { 50: "#ecfbff", 100: "#d3f4ff", …, 500: "#3ab6dd", …, 950: "#08333f" }
 *
 * @example Anchoring keeps the source colour exact
 * const ramp = scale("#4cc9f0");
 * ramp[nearestStop("#4cc9f0")] === "#4cc9f0"; // true
 */
export function scale(color: string | RGB, options: ScaleOptions = {}): ToneScale {
  const { anchor = true, saturation = 1, hueShift = 0 } = options;

  const rgb = typeof color === "string" ? fromHex(color) : color;
  const [, baseChroma, baseHue] = rgbToOklch(rgb);
  const anchorStop = anchor ? nearestStop(rgb) : null;

  const out = {} as ToneScale;
  for (const stop of TONE_STOPS) {
    if (stop === anchorStop) {
      out[stop] = toHex(rgb);
      continue;
    }
    // 0 at the light end, 1 at the dark end, drives the hue rotation.
    const t = TONE_STOPS.indexOf(stop) / (TONE_STOPS.length - 1);
    const target: OKLCH = [
      LIGHTNESS[stop],
      baseChroma * CHROMA_FACTOR[stop] * saturation,
      (baseHue + hueShift * t + 360) % 360,
    ];
    out[stop] = toHex(oklchToRgbClipped(target));
  }
  return out;
}

/**
 * A neutral grey ramp carrying a trace of the brand hue.
 *
 * Pure `#808080` greys next to a saturated brand colour read as dirty; keeping
 * 2 to 4% of the brand chroma in the greys is the trick that makes a palette feel
 * designed rather than assembled.
 */
export function neutralScale(color: string | RGB, tint = 0.03): ToneScale {
  const rgb = typeof color === "string" ? fromHex(color) : color;
  const hue = rgbToOklch(rgb)[2];

  const out = {} as ToneScale;
  for (const stop of TONE_STOPS) {
    // Carry slightly more tint through the midtones, where the eye can see it.
    const chroma = tint * (0.5 + CHROMA_FACTOR[stop] * 0.5);
    out[stop] = toHex(oklchToRgbClipped([LIGHTNESS[stop], chroma, hue]));
  }
  return out;
}

/**
 * Rotate a colour's hue while holding lightness and chroma. The basis for
 * complementary (180°), triadic (±120°) and analogous (±30°) harmonies.
 */
export function rotateHue(color: string | RGB, degrees: number): string {
  const rgb = typeof color === "string" ? fromHex(color) : color;
  const [l, c, h] = rgbToOklch(rgb);
  return toHex(oklchToRgbClipped([l, c, (h + degrees + 360) % 360]));
}

/** Classic harmony sets, all computed in OKLCH so lightness stays constant. */
export const harmony = {
  complementary: (c: string | RGB) => [rotateHue(c, 180)],
  analogous: (c: string | RGB) => [rotateHue(c, -30), rotateHue(c, 30)],
  triadic: (c: string | RGB) => [rotateHue(c, 120), rotateHue(c, 240)],
  tetradic: (c: string | RGB) => [rotateHue(c, 90), rotateHue(c, 180), rotateHue(c, 270)],
  splitComplementary: (c: string | RGB) => [rotateHue(c, 150), rotateHue(c, 210)],
} as const;
