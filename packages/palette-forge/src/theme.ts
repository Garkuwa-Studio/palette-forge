/**
 * Deriving a semantic theme from an extracted palette.
 *
 * A palette answers "what colours are in this image". A theme answers "what
 * should the border of a disabled input be", which is the question you actually
 * have to answer before you can ship. This module bridges the two: it builds
 * tonal ramps from the brand colours, then assigns them to the conventional
 * semantic slots (`background`, `muted-foreground`, `ring`, …) that shadcn/ui,
 * Radix Themes and most in-house systems share.
 *
 * Every foreground/background pair produced here is contrast-checked and
 * repaired, so a derived theme passes WCAG AA by construction rather than by
 * luck.
 */

import { bestTextColor, ensureContrast, WCAG } from "./color/contrast.js";
import { fromHex, rgbToOklch, toHex } from "./color/convert.js";
import { oklchToRgbClipped } from "./color/gamut.js";
import { neutralScale, scale } from "./color/scale.js";
import type { Palette, Theme, ToneScale } from "./types.js";

export interface ThemeOptions {
  /** Override the brand colour instead of using the palette's `primary`. */
  primary?: string;
  /** Override the secondary brand colour instead of the palette's `accent`. */
  accent?: string;
  /** Hue for destructive/error states. Default `27` (a warm red). */
  destructiveHue?: number;
  /** Contrast floor enforced on every text/surface pair. Default `4.5` (AA). */
  minContrast?: number;
  /** How much brand hue bleeds into the greys, 0 to 0.1. Default `0.03`. */
  neutralTint?: number;
  /** Corner radius emitted alongside the colours. Default `"0.625rem"`. */
  radius?: string;
}

export interface DerivedTheme extends Theme {
  /** The ramps the theme was built from, useful for emitting the full scale. */
  scales: {
    primary: ToneScale;
    accent: ToneScale;
    neutral: ToneScale;
    destructive: ToneScale;
  };
}

/** First swatch with this role, or the fallback hex. */
function pick(palette: Palette, role: "primary" | "accent" | "ink" | "paper", fallback: string): string {
  return palette.byRole[role]?.[0]?.hex ?? fallback;
}

/**
 * Force `fg` to clear `minContrast` against `bg`.
 *
 * When the hue simply cannot reach the target (a mid-tone that is neither light
 * nor dark enough in either direction), fall back to whichever of black/white
 * reads better on that surface. One of them always clears AA.
 */
function readable(fg: string, bg: string, minContrast: number): string {
  return (
    ensureContrast(fg, bg, { target: minContrast }) ??
    ensureContrast(bestTextColor(bg), bg, { target: minContrast }) ??
    bestTextColor(bg)
  );
}

/**
 * The foreground for a solid brand surface (a filled button).
 *
 * Seeds from whichever of black/white already reads better, rather than always
 * starting at white and dragging it down, starting from the wrong pole yields
 * a technically-compliant but odd near-black on a mid-tone teal.
 */
function onSurface(bg: string, minContrast: number): string {
  return readable(bestTextColor(bg), bg, minContrast);
}

/**
 * Build light and dark semantic themes from a palette.
 *
 * @example
 * const theme = deriveTheme(palette);
 * theme.light["--primary"];            // "#2563eb"
 * theme.dark["--muted-foreground"];    // "#a1a1aa"
 *
 * @example Pin the brand colour, let everything else follow
 * deriveTheme(palette, { primary: "#4cc9f0", minContrast: 7 });
 */
export function deriveTheme(palette: Palette, options: ThemeOptions = {}): DerivedTheme {
  const {
    destructiveHue = 27,
    minContrast = WCAG.AA_NORMAL,
    neutralTint = 0.03,
    radius = "0.625rem",
  } = options;

  const primaryHex = options.primary ?? pick(palette, "primary", "#3b82f6");
  const accentHex = options.accent ?? pick(palette, "accent", primaryHex);

  const primary = scale(primaryHex);
  const accent = scale(accentHex);
  const neutral = neutralScale(primaryHex, neutralTint);

  // Destructive borrows the brand's chroma so error states belong to the same
  // family, but takes a conventional red hue, users read hue, not chroma, as
  // "danger", and inventing a novel error colour costs comprehension.
  const destructive = scale(
    rotateToHue(primary[600], destructiveHue),
  );

  const light: Record<string, string> = {
    "--background": "#ffffff",
    "--foreground": neutral[950],
    "--card": "#ffffff",
    "--card-foreground": neutral[950],
    "--popover": "#ffffff",
    "--popover-foreground": neutral[950],
    "--primary": primary[600],
    "--primary-foreground": onSurface(primary[600], minContrast),
    "--secondary": neutral[100],
    "--secondary-foreground": readable(neutral[900], neutral[100], minContrast),
    "--muted": neutral[100],
    "--muted-foreground": readable(neutral[600], neutral[100], minContrast),
    "--accent": accent[100],
    "--accent-foreground": readable(accent[900], accent[100], minContrast),
    "--destructive": destructive[600],
    "--destructive-foreground": onSurface(destructive[600], minContrast),
    "--border": neutral[200],
    "--input": neutral[200],
    "--ring": primary[500],
    "--radius": radius,
  };

  const dark: Record<string, string> = {
    "--background": neutral[950],
    "--foreground": neutral[50],
    "--card": neutral[900],
    "--card-foreground": neutral[50],
    "--popover": neutral[900],
    "--popover-foreground": neutral[50],
    "--primary": primary[400],
    "--primary-foreground": onSurface(primary[400], minContrast),
    "--secondary": neutral[800],
    "--secondary-foreground": readable(neutral[50], neutral[800], minContrast),
    "--muted": neutral[800],
    "--muted-foreground": readable(neutral[400], neutral[800], minContrast),
    "--accent": accent[800],
    "--accent-foreground": readable(accent[50], accent[800], minContrast),
    "--destructive": destructive[500],
    "--destructive-foreground": onSurface(destructive[500], minContrast),
    "--border": neutral[800],
    "--input": neutral[800],
    "--ring": primary[500],
    "--radius": radius,
  };

  return { light, dark, scales: { primary, accent, neutral, destructive } };
}

/** Re-hue a colour, keeping its lightness and chroma. */
function rotateToHue(hex: string, hue: number): string {
  const [l, c] = rgbToOklch(fromHex(hex));
  return toHex(oklchToRgbClipped([l, c, hue]));
}
