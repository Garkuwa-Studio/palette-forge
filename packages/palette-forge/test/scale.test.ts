import { describe, expect, it } from "vitest";
import { fromHex, rgbToOklch } from "../src/color/convert.js";
import { inGamut, maxChroma, clipToGamut } from "../src/color/gamut.js";
import { harmony, nearestStop, neutralScale, rotateHue, scale, TONE_STOPS } from "../src/color/scale.js";
import { relativeLuminance } from "../src/color/contrast.js";

describe("scale", () => {
  const ramp = scale("#4cc9f0");

  it("produces all eleven stops", () => {
    expect(Object.keys(ramp)).toHaveLength(11);
    for (const stop of TONE_STOPS) {
      expect(ramp[stop]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("darkens monotonically from 50 to 950", () => {
    const luminances = TONE_STOPS.map((stop) => relativeLuminance(ramp[stop]));
    for (let i = 1; i < luminances.length; i++) {
      expect(luminances[i]!).toBeLessThan(luminances[i - 1]!);
    }
  });

  it("anchors the source colour exactly at its nearest stop", () => {
    const stop = nearestStop("#4cc9f0");
    expect(ramp[stop]).toBe("#4cc9f0");
  });

  it("can skip anchoring", () => {
    const unanchored = scale("#4cc9f0", { anchor: false });
    const stop = nearestStop("#4cc9f0");
    // Without the anchor the stop lands on its target lightness instead.
    expect(unanchored[stop]).not.toBe("#4cc9f0");
  });

  it("holds hue across the ramp", () => {
    const baseHue = rgbToOklch(fromHex("#4cc9f0"))[2];
    // Extremes lose chroma to the gamut, so check the chromatic middle.
    for (const stop of [300, 400, 500, 600, 700] as const) {
      const hue = rgbToOklch(fromHex(ramp[stop]))[2];
      expect(Math.abs(hue - baseHue)).toBeLessThan(6);
    }
  });

  it("keeps every stop inside the sRGB gamut", () => {
    for (const stop of TONE_STOPS) {
      expect(inGamut(fromHex(ramp[stop]))).toBe(true);
    }
  });

  it("responds to the saturation control", () => {
    const muted = scale("#4cc9f0", { saturation: 0.4, anchor: false });
    const vivid = scale("#4cc9f0", { saturation: 1, anchor: false });
    expect(rgbToOklch(fromHex(muted[500]))[1]).toBeLessThan(
      rgbToOklch(fromHex(vivid[500]))[1],
    );
  });

  it("applies a hue shift across the ramp", () => {
    const shifted = scale("#4cc9f0", { hueShift: -30, anchor: false });
    const light = rgbToOklch(fromHex(shifted[100]))[2];
    const dark = rgbToOklch(fromHex(shifted[900]))[2];
    expect(dark).toBeLessThan(light);
  });

  it("works for colours at the gamut edge", () => {
    for (const color of ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#000000", "#ffffff"]) {
      const r = scale(color);
      for (const stop of TONE_STOPS) {
        expect(r[stop]).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });
});

describe("neutralScale", () => {
  it("stays near-grey but carries the brand hue", () => {
    const greys = neutralScale("#4cc9f0", 0.03);
    const brandHue = rgbToOklch(fromHex("#4cc9f0"))[2];
    for (const stop of [200, 500, 800] as const) {
      const [, chroma, hue] = rgbToOklch(fromHex(greys[stop]));
      expect(chroma).toBeLessThan(0.05);
      expect(Math.abs(hue - brandHue)).toBeLessThan(10);
    }
  });

  it("darkens monotonically", () => {
    const greys = neutralScale("#4cc9f0");
    const luminances = TONE_STOPS.map((stop) => relativeLuminance(greys[stop]));
    for (let i = 1; i < luminances.length; i++) {
      expect(luminances[i]!).toBeLessThan(luminances[i - 1]!);
    }
  });
});

describe("gamut mapping", () => {
  it("leaves in-gamut colours alone", () => {
    const oklch = rgbToOklch(fromHex("#4cc9f0"));
    expect(clipToGamut(oklch)[1]).toBeCloseTo(oklch[1], 5);
  });

  it("reduces chroma rather than clipping channels", () => {
    // Impossible: near-white with heavy chroma.
    const clipped = clipToGamut([0.97, 0.4, 250]);
    expect(clipped[0]).toBeCloseTo(0.97, 5); // lightness held
    expect(clipped[2]).toBe(250); // hue held
    expect(clipped[1]).toBeLessThan(0.4); // chroma sacrificed
  });

  it("reports zero headroom at the poles", () => {
    expect(maxChroma(1, 250)).toBeLessThan(0.01);
    expect(maxChroma(0, 250)).toBeLessThan(0.01);
  });
});

describe("harmony", () => {
  it("rotates hue by the expected amount", () => {
    const base = rgbToOklch(fromHex("#4cc9f0"))[2];
    const complement = rgbToOklch(fromHex(rotateHue("#4cc9f0", 180)))[2];
    expect(Math.abs(((complement - base + 360) % 360) - 180)).toBeLessThan(2);
  });

  it("returns the right number of colours per scheme", () => {
    expect(harmony.complementary("#4cc9f0")).toHaveLength(1);
    expect(harmony.analogous("#4cc9f0")).toHaveLength(2);
    expect(harmony.triadic("#4cc9f0")).toHaveLength(2);
    expect(harmony.tetradic("#4cc9f0")).toHaveLength(3);
    expect(harmony.splitComplementary("#4cc9f0")).toHaveLength(2);
  });
});
