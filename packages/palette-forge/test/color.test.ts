import { describe, expect, it } from "vitest";
import {
  fromHex,
  hslToRgb,
  isHex,
  labToRgb,
  oklabToRgb,
  oklchToRgb,
  rgbToHsl,
  rgbToLab,
  rgbToOklab,
  rgbToOklch,
  toHex,
} from "../src/color/convert.js";
import { channelDelta } from "./helpers.js";
import type { RGB } from "../src/types.js";

const SAMPLES: RGB[] = [
  [0, 0, 0],
  [255, 255, 255],
  [76, 201, 240],
  [240, 85, 76],
  [18, 18, 18],
  [127, 127, 127],
  [255, 0, 0],
  [0, 128, 64],
  [12, 200, 3],
];

describe("hex", () => {
  it("round-trips through hex", () => {
    for (const rgb of SAMPLES) {
      expect(fromHex(toHex(rgb))).toEqual(rgb);
    }
  });

  it("normalises to lowercase 6-digit form", () => {
    expect(toHex([76, 201, 240])).toBe("#4cc9f0");
  });

  it("expands shorthand", () => {
    expect(fromHex("#f0c")).toEqual([255, 0, 204]);
    expect(fromHex("fff")).toEqual([255, 255, 255]);
  });

  it("accepts and discards alpha", () => {
    expect(fromHex("#4cc9f080")).toEqual([76, 201, 240]);
    // #RGBA shorthand: the trailing 9 is alpha, so RGB expands to 44cccc.
    expect(fromHex("#4cc9")).toEqual([68, 204, 204]);
  });

  it("clamps out-of-range channels", () => {
    expect(toHex([-10, 300, 128.6])).toBe("#00ff81");
  });

  it("rejects nonsense", () => {
    expect(() => fromHex("not-a-colour")).toThrow(TypeError);
    expect(() => fromHex("#12345")).toThrow(TypeError);
    expect(isHex("#4cc9f0")).toBe(true);
    expect(isHex("rgb(1,2,3)")).toBe(false);
  });
});

describe("CIELAB", () => {
  it("round-trips within a rounding error", () => {
    for (const rgb of SAMPLES) {
      const back = labToRgb(rgbToLab(rgb)).map(Math.round) as unknown as RGB;
      expect(channelDelta(rgb, back)).toBeLessThanOrEqual(1);
    }
  });

  it("puts white at L=100 and black at L=0", () => {
    expect(rgbToLab([255, 255, 255])[0]).toBeCloseTo(100, 1);
    expect(rgbToLab([0, 0, 0])[0]).toBeCloseTo(0, 4);
  });

  it("reports neutral grey as having no chroma", () => {
    const [, a, b] = rgbToLab([128, 128, 128]);
    expect(Math.abs(a)).toBeLessThan(0.01);
    expect(Math.abs(b)).toBeLessThan(0.01);
  });
});

describe("OKLab / OKLCH", () => {
  it("round-trips OKLab within a rounding error", () => {
    for (const rgb of SAMPLES) {
      const back = oklabToRgb(rgbToOklab(rgb)).map(Math.round) as unknown as RGB;
      expect(channelDelta(rgb, back)).toBeLessThanOrEqual(1);
    }
  });

  it("round-trips OKLCH within a rounding error", () => {
    for (const rgb of SAMPLES) {
      const back = oklchToRgb(rgbToOklch(rgb)).map(Math.round) as unknown as RGB;
      expect(channelDelta(rgb, back)).toBeLessThanOrEqual(1);
    }
  });

  it("anchors white and black", () => {
    expect(rgbToOklab([255, 255, 255])[0]).toBeCloseTo(1, 3);
    expect(rgbToOklab([0, 0, 0])[0]).toBeCloseTo(0, 4);
  });

  it("pins hue to zero for greys so they compare equal", () => {
    expect(rgbToOklch([128, 128, 128])[1]).toBeLessThan(1e-6);
    expect(rgbToOklch([128, 128, 128])[2]).toBe(0);
  });

  it("keeps hue stable across a lightness change", () => {
    // The whole point of OKLCH: darkening should not shift the hue.
    const [l, c, h] = rgbToOklch([76, 201, 240]);
    const darker = rgbToOklch(oklchToRgb([l * 0.6, c, h]));
    expect(Math.abs(darker[2] - h)).toBeLessThan(1.5);
  });
});

describe("HSL", () => {
  it("round-trips within a rounding error", () => {
    for (const rgb of SAMPLES) {
      const back = hslToRgb(rgbToHsl(rgb)).map(Math.round) as unknown as RGB;
      // HSL is stored rounded to whole degrees/percents, so tolerance is wider.
      expect(channelDelta(rgb, back)).toBeLessThanOrEqual(3);
    }
  });

  it("reports the primaries at the expected hues", () => {
    expect(rgbToHsl([255, 0, 0])[0]).toBe(0);
    expect(rgbToHsl([0, 255, 0])[0]).toBe(120);
    expect(rgbToHsl([0, 0, 255])[0]).toBe(240);
  });
});
