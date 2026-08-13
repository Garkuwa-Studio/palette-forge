/**
 * Colour space conversions.
 *
 * sRGB is the hub: every other space converts to and from it. Matrices are the
 * standard D65 sRGB primaries; OKLab coefficients are Björn Ottosson's.
 */

import type { HSL, Lab, OKLab, OKLCH, RGB } from "../types.js";

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);

/** Clamp to 0 to 255 and round. */
export const clamp255 = (n: number) => clamp(Math.round(n), 0, 255);

/* ------------------------------------------------------------------ hex --- */

/** `[76, 201, 240]` → `"#4cc9f0"`. Always lowercase, always 6 digits. */
export function toHex(rgb: RGB): string {
  return (
    "#" +
    rgb
      .map((c) => clamp255(c).toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Parse `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` (with or without `#`).
 * Alpha is parsed but discarded. This library works in opaque sRGB.
 *
 * @throws if the string isn't a hex colour.
 */
export function fromHex(hex: string): RGB {
  const s = hex.trim().replace(/^#/, "");
  const valid = /^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s);
  if (!valid) throw new TypeError(`Not a hex colour: ${JSON.stringify(hex)}`);

  const expand = s.length <= 4 ? s.slice(0, 3).replace(/./g, (c) => c + c) : s.slice(0, 6);
  return [
    parseInt(expand.slice(0, 2), 16),
    parseInt(expand.slice(2, 4), 16),
    parseInt(expand.slice(4, 6), 16),
  ];
}

/** True when the string parses as a hex colour. */
export function isHex(hex: string): boolean {
  return /^#?(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex.trim());
}

/* --------------------------------------------------------- transfer fns --- */

/** sRGB 0 to 255 → linear-light 0 to 1. */
export function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear-light 0 to 1 → sRGB 0 to 255 (unclamped; caller decides on gamut). */
export function fromLinear(channel: number): number {
  const c = channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
  return c * 255;
}

/* ------------------------------------------------------------ CIE XYZ ----- */

const D65 = { x: 0.95047, y: 1.0, z: 1.08883 } as const;

export function rgbToXyz(rgb: RGB): [number, number, number] {
  const r = toLinear(rgb[0]);
  const g = toLinear(rgb[1]);
  const b = toLinear(rgb[2]);
  return [
    r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    r * 0.2126729 + g * 0.7151522 + b * 0.072175,
    r * 0.0193339 + g * 0.119192 + b * 0.9503041,
  ];
}

export function xyzToRgb(xyz: readonly [number, number, number]): RGB {
  const [x, y, z] = xyz;
  return [
    fromLinear(x * 3.2404542 + y * -1.5371385 + z * -0.4985314),
    fromLinear(x * -0.969266 + y * 1.8760108 + z * 0.041556),
    fromLinear(x * 0.0556434 + y * -0.2040259 + z * 1.0572252),
  ];
}

/* ------------------------------------------------------------- CIELAB ----- */

const LAB_E = 216 / 24389; // 0.008856
const LAB_K = 24389 / 27; // 903.3

export function rgbToLab(rgb: RGB): Lab {
  const [x, y, z] = rgbToXyz(rgb);
  const f = (t: number) => (t > LAB_E ? Math.cbrt(t) : (LAB_K * t + 16) / 116);
  const fx = f(x / D65.x);
  const fy = f(y / D65.y);
  const fz = f(z / D65.z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labToRgb(lab: Lab): RGB {
  const [l, a, b] = lab;
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t: number) => {
    const t3 = t ** 3;
    return t3 > LAB_E ? t3 : (116 * t - 16) / LAB_K;
  };
  return xyzToRgb([inv(fx) * D65.x, inv(fy) * D65.y, inv(fz) * D65.z]);
}

/* -------------------------------------------------------------- OKLab ----- */

export function rgbToOklab(rgb: RGB): OKLab {
  const r = toLinear(rgb[0]);
  const g = toLinear(rgb[1]);
  const b = toLinear(rgb[2]);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → sRGB. May return out-of-gamut channels; see {@link clipToGamut}. */
export function oklabToRgb(oklab: OKLab): RGB {
  const [L, A, B] = oklab;

  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  return [
    fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/* -------------------------------------------------------------- OKLCH ----- */

export function oklabToOklch(oklab: OKLab): OKLCH {
  const [l, a, b] = oklab;
  const c = Math.sqrt(a * a + b * b);
  // Hue is meaningless at zero chroma; pin it to 0 so greys compare equal.
  let h = c < 1e-7 ? 0 : (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [l, c, h];
}

export function oklchToOklab(oklch: OKLCH): OKLab {
  const [l, c, h] = oklch;
  const rad = (h * Math.PI) / 180;
  return [l, c * Math.cos(rad), c * Math.sin(rad)];
}

export const rgbToOklch = (rgb: RGB): OKLCH => oklabToOklch(rgbToOklab(rgb));
export const oklchToRgb = (oklch: OKLCH): RGB => oklabToRgb(oklchToOklab(oklch));

/* ---------------------------------------------------------------- HSL ----- */

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb[0] / 255;
  const g = rgb[1] / 255;
  const b = rgb[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  let h = 0;
  if (d !== 0) {
    h =
      max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export function hslToRgb(hsl: HSL): RGB {
  const [h, s, l] = [hsl[0], hsl[1] / 100, hsl[2] / 100];
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(((h % 360) + 360) % 360 / 60);
  const [r, g, b] =
    ([
      [c, x, 0],
      [x, c, 0],
      [0, c, x],
      [0, x, c],
      [x, 0, c],
      [c, 0, x],
    ] as const)[seg] ?? ([0, 0, 0] as const);
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/* --------------------------------------------------------------- misc ----- */

/** Squared euclidean distance, used as the k-means metric, so no sqrt. */
export function distanceSq(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const d0 = a[0] - b[0];
  const d1 = a[1] - b[1];
  const d2 = a[2] - b[2];
  return d0 * d0 + d1 * d1 + d2 * d2;
}

/** CSS `oklch()` string, e.g. `oklch(72.3% 0.145 231.4)`. */
export function formatOklch(oklch: OKLCH, precision = 3): string {
  const [l, c, h] = oklch;
  const p = (n: number) => +n.toFixed(precision);
  return `oklch(${+(l * 100).toFixed(1)}% ${p(c)} ${+h.toFixed(1)})`;
}
