/**
 * sRGB gamut mapping for OKLCH colours.
 *
 * Generating a tonal ramp means asking for lightness/chroma combinations that
 * often fall outside sRGB. A vivid blue at 95% lightness simply does not exist.
 * Naively clamping the RGB channels shifts hue badly (a clipped blue skews
 * purple), so instead we hold lightness and hue and reduce chroma until the
 * colour fits, which is what CSS Color 4's gamut mapping algorithm prescribes.
 */

import type { OKLCH, RGB } from "../types.js";
import { oklchToRgb } from "./convert.js";

/** Small tolerance so floating-point noise doesn't count as out-of-gamut. */
const EPSILON = 1e-4;

/** True when every channel sits within 0 to 255 (within rounding tolerance). */
export function inGamut(rgb: RGB): boolean {
  return rgb.every((c) => c >= -EPSILON && c <= 255 + EPSILON);
}

/**
 * Reduce chroma until the colour fits in sRGB, preserving lightness and hue.
 *
 * Lightness outside 0 to 1 is clamped first: nothing above white or below black is
 * representable at any chroma.
 */
export function clipToGamut(oklch: OKLCH): OKLCH {
  const l = Math.min(1, Math.max(0, oklch[0]));
  const h = oklch[2];
  const c = Math.max(0, oklch[1]);

  if (inGamut(oklchToRgb([l, c, h]))) return [l, c, h];

  // Chroma 0 is always in gamut (it's a grey), so the search always terminates.
  let lo = 0;
  let hi = c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb([l, mid, h]))) lo = mid;
    else hi = mid;
  }
  return [l, lo, h];
}

/** Gamut-map an OKLCH colour and return displayable sRGB. */
export function oklchToRgbClipped(oklch: OKLCH): RGB {
  const [l, c, h] = clipToGamut(oklch);
  const rgb = oklchToRgb([l, c, h]);
  // Residual sub-LSB overshoot from the binary search, safe to clamp now that
  // hue and lightness have already been honoured.
  return [
    Math.min(255, Math.max(0, rgb[0])),
    Math.min(255, Math.max(0, rgb[1])),
    Math.min(255, Math.max(0, rgb[2])),
  ];
}

/** Largest chroma that fits in sRGB at this lightness and hue. */
export function maxChroma(lightness: number, hue: number): number {
  return clipToGamut([lightness, 0.5, hue])[1];
}
