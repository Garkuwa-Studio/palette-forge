/**
 * WCAG 2.1 contrast: ratios, conformance levels, and repair.
 *
 * The maths here is deliberately the letter of the spec (relative luminance on
 * linearised sRGB, `(L1 + 0.05) / (L2 + 0.05)`) rather than a perceptual model.
 * It is what auditors, Lighthouse and legal accessibility requirements measure,
 * so it is what this library reports.
 */

import type { ContrastResult, RGB } from "../types.js";
import { fromHex, rgbToOklch, toHex, toLinear } from "./convert.js";
import { oklchToRgbClipped } from "./gamut.js";

/** WCAG 2.1 thresholds, exported so callers don't re-hardcode them. */
export const WCAG = {
  /** Body text, AA. */
  AA_NORMAL: 4.5,
  /** ≥18.66px bold or ≥24px regular, AA. Also the bar for UI components. */
  AA_LARGE: 3,
  /** Body text, AAA. */
  AAA_NORMAL: 7,
  /** Large text, AAA. */
  AAA_LARGE: 4.5,
  /** Icons, form borders, focus indicators (SC 1.4.11). */
  UI_COMPONENT: 3,
} as const;

/** Relative luminance per WCAG 2.1, 0 (black) to 1 (white). */
export function relativeLuminance(color: RGB | string): number {
  const rgb = typeof color === "string" ? fromHex(color) : color;
  return (
    0.2126 * toLinear(rgb[0]) + 0.7152 * toLinear(rgb[1]) + 0.0722 * toLinear(rgb[2])
  );
}

/**
 * Contrast ratio between two colours, 1 to 21, rounded to 2dp.
 * Order-independent, `contrast(a, b) === contrast(b, a)`.
 */
export function contrast(a: RGB | string, b: RGB | string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  return Math.round(ratio * 100) / 100;
}

/** Full conformance breakdown for a foreground/background pairing. */
export function evaluateContrast(
  foreground: RGB | string,
  background: RGB | string,
): ContrastResult {
  const fg = typeof foreground === "string" ? foreground.toLowerCase() : toHex(foreground);
  const bg = typeof background === "string" ? background.toLowerCase() : toHex(background);
  const ratio = contrast(foreground, background);

  return {
    foreground: fg,
    background: bg,
    ratio,
    aaNormal: ratio >= WCAG.AA_NORMAL,
    aaLarge: ratio >= WCAG.AA_LARGE,
    aaaNormal: ratio >= WCAG.AAA_NORMAL,
    aaaLarge: ratio >= WCAG.AAA_LARGE,
    uiComponent: ratio >= WCAG.UI_COMPONENT,
    level: ratio >= WCAG.AAA_NORMAL ? "AAA" : ratio >= WCAG.AA_NORMAL ? "AA" : "fail",
  };
}

export interface MatrixOptions {
  /** Drop pairings below this ratio. They're never useful. Default `1.6`. */
  minRatio?: number;
  /** Cap the result length, highest ratio first. Default: unlimited. */
  limit?: number;
}

/**
 * Every ordered foreground/background pairing among `colors`, ranked by ratio.
 *
 * Ratios are symmetric, so each unordered pair appears once, with the darker
 * colour as foreground, which is how the pairing is nearly always used.
 */
export function contrastMatrix(
  colors: Array<string | RGB>,
  options: MatrixOptions = {},
): ContrastResult[] {
  const { minRatio = 1.6, limit } = options;
  const hexes = colors.map((c) => (typeof c === "string" ? c.toLowerCase() : toHex(c)));

  const out: ContrastResult[] = [];
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      const a = hexes[i]!;
      const b = hexes[j]!;
      // Darker colour reads as the foreground.
      const [fg, bg] = relativeLuminance(a) <= relativeLuminance(b) ? [a, b] : [b, a];
      const result = evaluateContrast(fg, bg);
      if (result.ratio >= minRatio) out.push(result);
    }
  }

  out.sort((x, y) => y.ratio - x.ratio);
  return limit === undefined ? out : out.slice(0, limit);
}

/**
 * Pick whichever of `#000000` / `#ffffff` reads better on `background`.
 *
 * The 0.179 luminance crossover is where black and white contrast equally; using
 * it instead of a naive lightness check is what keeps mid-tone blues and reds
 * from getting unreadable white text.
 */
export function bestTextColor(background: RGB | string): "#000000" | "#ffffff" {
  return relativeLuminance(background) > 0.179 ? "#000000" : "#ffffff";
}

/** From `candidates`, the colour with the highest contrast against `background`. */
export function mostReadable(
  background: RGB | string,
  candidates: Array<string | RGB>,
): string {
  let best = "";
  let bestRatio = -1;
  for (const candidate of candidates) {
    const ratio = contrast(candidate, background);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = typeof candidate === "string" ? candidate.toLowerCase() : toHex(candidate);
    }
  }
  return best;
}

export interface EnsureContrastOptions {
  /** Ratio to reach. Default `WCAG.AA_NORMAL` (4.5). */
  target?: number;
  /**
   * Which way to move the foreground's lightness. `"auto"` (default) moves away
   * from the background, darker on light backgrounds, lighter on dark ones.
   */
  direction?: "auto" | "lighter" | "darker";
  /** Keep chroma fixed instead of letting gamut mapping reduce it. Default `false`. */
  preserveChroma?: boolean;
}

/**
 * Nudge `foreground`'s lightness until it hits `target` contrast on `background`,
 * holding hue (and, as far as the sRGB gamut allows, chroma).
 *
 * Returns the adjusted hex, or `null` when the target is unreachable in this hue
 *, e.g. asking for 7:1 against a mid-grey, where neither direction has room.
 *
 * @example
 * ensureContrast("#4cc9f0", "#ffffff")          // → "#00618a", now 4.5:1
 * ensureContrast("#4cc9f0", "#ffffff", { target: 7 })
 */
export function ensureContrast(
  foreground: RGB | string,
  background: RGB | string,
  options: EnsureContrastOptions = {},
): string | null {
  const {
    target = WCAG.AA_NORMAL,
    direction = "auto",
    preserveChroma = false,
  } = options;

  const fgRgb = typeof foreground === "string" ? fromHex(foreground) : foreground;
  const bgRgb = typeof background === "string" ? fromHex(background) : background;
  if (contrast(fgRgb, bgRgb) >= target) return toHex(fgRgb);

  const [l0, c, h] = rgbToOklch(fgRgb);

  const directions: Array<"lighter" | "darker"> =
    direction === "auto"
      ? relativeLuminance(bgRgb) > 0.5
        ? ["darker", "lighter"]
        : ["lighter", "darker"]
      : [direction];

  // `t` interpolates from the original lightness (0) to the extreme (1). Chroma
  // is eased down alongside it because no hue holds full chroma near the poles.
  //
  // The result is quantised to 8-bit here, not at the end: searching in float
  // space and rounding afterwards can drop the answer back below the target
  // (4.4996 rounds to a hex whose real ratio is 4.48), which would defeat the
  // entire purpose of this function.
  const at = (t: number, endpoint: 0 | 1): RGB => {
    const l = l0 * (1 - t) + endpoint * t;
    const chroma = preserveChroma ? c : c * (1 - t * 0.35);
    return fromHex(toHex(oklchToRgbClipped([l, chroma, h])));
  };

  for (const dir of directions) {
    const endpoint = dir === "darker" ? 0 : 1;

    // If even the extreme misses the target, this direction has no solution.
    if (contrast(at(1, endpoint), bgRgb) < target) continue;

    // Binary search for the smallest move that clears the target.
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (contrast(at(mid, endpoint), bgRgb) >= target) hi = mid;
      else lo = mid;
    }
    return toHex(at(hi, endpoint));
  }

  return null;
}
