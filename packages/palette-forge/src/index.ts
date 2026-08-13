/**
 * Palette Forge, extract a brand palette from any image and emit design tokens.
 *
 * @example Browser, from a dropped file
 * ```ts
 * import { extractPaletteFromImage, toCSS } from "palette-forge";
 *
 * const palette = await extractPaletteFromImage(file, { colors: 6 });
 * console.log(toCSS(palette));
 * ```
 *
 * @example Node, from disk
 * ```ts
 * import { extractPaletteFromFile } from "palette-forge/node";
 * import { toShadcn } from "palette-forge";
 *
 * const palette = await extractPaletteFromFile("./logo.png");
 * await writeFile("globals.css", toShadcn(palette));
 * ```
 *
 * @packageDocumentation
 */

/* -------------------------------------------------------------- core --- */

export { extractPalette, DEFAULT_OPTIONS } from "./extract.js";
export {
  extractPaletteFromImage,
  toPixelSource,
  canRasterise,
  type ImageInput,
} from "./browser.js";

/* ------------------------------------------------------------ colour --- */

export {
  toHex,
  fromHex,
  isHex,
  toLinear,
  fromLinear,
  rgbToHsl,
  hslToRgb,
  rgbToLab,
  labToRgb,
  rgbToXyz,
  xyzToRgb,
  rgbToOklab,
  oklabToRgb,
  rgbToOklch,
  oklchToRgb,
  oklabToOklch,
  oklchToOklab,
  formatOklch,
  distanceSq,
  clamp255,
} from "./color/convert.js";

export {
  WCAG,
  contrast,
  relativeLuminance,
  evaluateContrast,
  contrastMatrix,
  bestTextColor,
  mostReadable,
  ensureContrast,
  type MatrixOptions,
  type EnsureContrastOptions,
} from "./color/contrast.js";

export { inGamut, clipToGamut, oklchToRgbClipped, maxChroma } from "./color/gamut.js";

export {
  scale,
  neutralScale,
  rotateHue,
  harmony,
  nearestStop,
  TONE_STOPS,
  type ScaleOptions,
} from "./color/scale.js";

/* ------------------------------------------------------------- roles --- */

export { assignRoles, nameSwatches, type RoleCandidate } from "./roles.js";

/* ------------------------------------------------------------- theme --- */

export {
  deriveTheme,
  type ThemeOptions,
  type DerivedTheme,
} from "./theme.js";

/* ----------------------------------------------------------- formats --- */

export {
  emit,
  emitters,
  extensions,
  toCSS,
  toTailwind,
  toSCSS,
  toTypeScript,
  toJavaScript,
  toJSON,
  toDTCG,
  toShadcn,
  toSVG,
  type TokenFormat,
  type EmitOptions,
} from "./formats/index.js";

/* --------------------------------------------------- low-level pieces --- */

export { samplePixels, type SampledPixels } from "./quantize/sample.js";
export { kmeans, type Cluster, type KMeansOptions, type KMeansResult } from "./quantize/kmeans.js";
export { mulberry32 } from "./quantize/rng.js";

/* ------------------------------------------------------------- types --- */

export type {
  RGB,
  HSL,
  Lab,
  OKLab,
  OKLCH,
  ColorSpace,
  Role,
  Swatch,
  Palette,
  PaletteMeta,
  PixelSource,
  ExtractOptions,
  ContrastResult,
  ToneScale,
  ToneStop,
  Theme,
} from "./types.js";
