/**
 * Core types for Palette Forge.
 *
 * Every colour triple in this library is a plain tuple so it stays structurally
 * typed, JSON-serialisable and free of class instances. That keeps results safe
 * to post across a Worker boundary or embed in a React Server Component payload.
 */

/** sRGB, each channel 0 to 255. Not necessarily integral until rounded for output. */
export type RGB = readonly [r: number, g: number, b: number];

/** HSL, `h` 0 to 360, `s`/`l` 0 to 100. */
export type HSL = readonly [h: number, s: number, l: number];

/** CIELAB (D65), `l` 0 to 100, `a`/`b` roughly -128 to 128. */
export type Lab = readonly [l: number, a: number, b: number];

/** OKLab, `l` 0 to 1, `a`/`b` roughly -0.4 to 0.4. */
export type OKLab = readonly [l: number, a: number, b: number];

/** OKLCH, `l` 0 to 1, `c` 0 to ~0.4, `h` 0 to 360. */
export type OKLCH = readonly [l: number, c: number, h: number];

/** Perceptual space used for clustering. */
export type ColorSpace = "oklab" | "lab";

/**
 * Semantic role inferred for a swatch.
 *
 * `ink` and `paper` are the darkest and lightest members of the palette. The
 * pair a text/background system is built on. `primary` and `accent` are the two
 * most brand-carrying chromatic colours. Everything else is `neutral` (low
 * saturation) or `support`.
 */
export type Role = "primary" | "accent" | "ink" | "paper" | "neutral" | "support";

/** A single extracted colour with everything the UI and emitters need. */
export interface Swatch {
  /** Lowercase 6-digit hex, e.g. `#4cc9f0`. */
  hex: string;
  rgb: RGB;
  hsl: HSL;
  oklch: OKLCH;
  /** Fraction of sampled (weighted) pixels this cluster owns, 0 to 1. */
  share: number;
  role: Role;
  /**
   * Token-safe unique name for this swatch, e.g. `primary`, `support-2`.
   * Stable for a given palette, emitters key off this.
   */
  name: string;
  /** Relative luminance per WCAG 2.1, 0 to 1. */
  luminance: number;
  /** `#000000` or `#ffffff`, whichever has more contrast against this swatch. */
  on: string;
}

/** Anything with RGBA bytes, `ImageData`, a Node decode result, or a raw buffer. */
export interface PixelSource {
  /** RGBA bytes, length `width * height * 4`. */
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface ExtractOptions {
  /** Number of clusters to solve for. Default `6`. Clamped to 1 to 24. */
  colors?: number;
  /**
   * Longest edge the image is downsampled to before clustering. Default `160`.
   * Cost is roughly quadratic in this number; 160 keeps a full extraction under
   * ~30ms on a laptop while staying stable across runs.
   */
  maxDimension?: number;
  /** Perceptual space for the distance metric. Default `"oklab"`. */
  space?: ColorSpace;
  /** Max Lloyd iterations. Default `24`. Converges early when assignments settle. */
  maxIterations?: number;
  /**
   * Seed for k-means++ initialisation. Fixed by default, so the same image
   * always yields the same palette. Pass a different number to resample.
   */
  seed?: number;
  /**
   * Down-weight greys and near-black/near-white pixels so a screenshot's chrome
   * doesn't crowd out the brand colours. Default `false`.
   */
  downweightNeutrals?: boolean;
  /** Alpha below this (0 to 255) is treated as transparent and skipped. Default `125`. */
  alphaThreshold?: number;
  /** Clusters owning less than this fraction of pixels are dropped. Default `0.004`. */
  minShare?: number;
}

export interface PaletteMeta {
  /** Pixels that passed the alpha threshold and were fed to the clusterer. */
  pixelsSampled: number;
  /** Dimensions actually clustered, after downsampling. */
  sampledWidth: number;
  sampledHeight: number;
  /** Lloyd iterations actually run before convergence. */
  iterations: number;
  /** Clusters requested (post-clamp). May exceed `swatches.length` after pruning. */
  requestedColors: number;
  space: ColorSpace;
  seed: number;
  durationMs: number;
}

export interface Palette {
  /** Swatches ordered by coverage, densest first. */
  swatches: Swatch[];
  /** Swatches grouped by inferred role. Roles with no members are absent. */
  byRole: Partial<Record<Role, Swatch[]>>;
  meta: PaletteMeta;
}

/** WCAG 2.1 conformance for one foreground/background pairing. */
export interface ContrastResult {
  foreground: string;
  background: string;
  /** Contrast ratio, 1 to 21, rounded to 2dp. */
  ratio: number;
  /** Passes 4.5:1, body text. */
  aaNormal: boolean;
  /** Passes 3:1, 18.66px bold or 24px regular and up. */
  aaLarge: boolean;
  /** Passes 7:1. */
  aaaNormal: boolean;
  /** Passes 4.5:1 at large sizes. */
  aaaLarge: boolean;
  /** Passes 3:1, icons, form borders, focus rings. */
  uiComponent: boolean;
  /** Best level this pairing earns for body text: `"AAA" | "AA" | "fail"`. */
  level: "AAA" | "AA" | "fail";
}

/** A generated tonal ramp, keyed by the conventional 50 to 950 stops. */
export type ToneScale = Record<ToneStop, string>;

export type ToneStop = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

/** Semantic, ready-to-ship theme derived from a palette. */
export interface Theme {
  light: Record<string, string>;
  dark: Record<string, string>;
}
