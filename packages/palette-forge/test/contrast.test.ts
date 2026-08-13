import { describe, expect, it } from "vitest";
import {
  bestTextColor,
  contrast,
  contrastMatrix,
  ensureContrast,
  evaluateContrast,
  mostReadable,
  relativeLuminance,
  WCAG,
} from "../src/color/contrast.js";
import { fromHex, rgbToOklch } from "../src/color/convert.js";

describe("contrast ratio", () => {
  it("matches the WCAG reference extremes", () => {
    expect(contrast("#000000", "#ffffff")).toBe(21);
    expect(contrast("#ffffff", "#ffffff")).toBe(1);
  });

  it("is symmetric", () => {
    expect(contrast("#4cc9f0", "#08090c")).toBe(contrast("#08090c", "#4cc9f0"));
  });

  it("matches the known 4.5:1 boundary grey", () => {
    // #767676 on white is the canonical "just passes AA" grey.
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 1);
    expect(evaluateContrast("#767676", "#ffffff").aaNormal).toBe(true);
    expect(evaluateContrast("#777777", "#ffffff").aaNormal).toBe(false);
  });

  it("computes relative luminance per spec", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 6);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 6);
    expect(relativeLuminance("#808080")).toBeCloseTo(0.2159, 3);
  });
});

describe("conformance levels", () => {
  it("grades body text correctly", () => {
    expect(evaluateContrast("#000000", "#ffffff").level).toBe("AAA");
    expect(evaluateContrast("#767676", "#ffffff").level).toBe("AA");
    expect(evaluateContrast("#aaaaaa", "#ffffff").level).toBe("fail");
  });

  it("separates large-text and UI thresholds from body text", () => {
    // Around 3.5:1, passes large text and UI, fails body copy.
    const result = evaluateContrast("#949494", "#ffffff");
    expect(result.ratio).toBeGreaterThan(WCAG.AA_LARGE);
    expect(result.ratio).toBeLessThan(WCAG.AA_NORMAL);
    expect(result.aaLarge).toBe(true);
    expect(result.uiComponent).toBe(true);
    expect(result.aaNormal).toBe(false);
  });
});

describe("contrastMatrix", () => {
  const colors = ["#08090c", "#ffffff", "#4cc9f0", "#f0554c"];

  it("returns each unordered pair once, ranked by ratio", () => {
    const matrix = contrastMatrix(colors, { minRatio: 1 });
    expect(matrix).toHaveLength(6); // 4 choose 2
    const ratios = matrix.map((m) => m.ratio);
    expect([...ratios].sort((a, b) => b - a)).toEqual(ratios);
  });

  it("puts the darker colour in the foreground", () => {
    const [pair] = contrastMatrix(["#ffffff", "#08090c"], { minRatio: 1 });
    expect(pair!.foreground).toBe("#08090c");
    expect(pair!.background).toBe("#ffffff");
  });

  it("honours minRatio and limit", () => {
    expect(contrastMatrix(colors, { minRatio: 10 }).length).toBeLessThan(6);
    expect(contrastMatrix(colors, { minRatio: 1, limit: 2 })).toHaveLength(2);
  });
});

describe("bestTextColor", () => {
  it("uses the luminance crossover, not naive lightness", () => {
    expect(bestTextColor("#ffffff")).toBe("#000000");
    expect(bestTextColor("#000000")).toBe("#ffffff");
    // A saturated mid blue: perceptually "medium" but dark by luminance.
    expect(bestTextColor("#2563eb")).toBe("#ffffff");
    // A mid yellow: bright by luminance, needs black.
    expect(bestTextColor("#facc15")).toBe("#000000");
  });

  it("always returns the better of the two", () => {
    for (const bg of ["#4cc9f0", "#7c8598", "#1f2430", "#f0a44c"]) {
      const chosen = bestTextColor(bg);
      const other = chosen === "#000000" ? "#ffffff" : "#000000";
      expect(contrast(chosen, bg)).toBeGreaterThanOrEqual(contrast(other, bg));
    }
  });
});

describe("mostReadable", () => {
  it("picks the highest-contrast candidate", () => {
    expect(mostReadable("#ffffff", ["#eeeeee", "#767676", "#000000"])).toBe("#000000");
  });
});

describe("ensureContrast", () => {
  it("leaves already-compliant colours untouched", () => {
    expect(ensureContrast("#000000", "#ffffff")).toBe("#000000");
  });

  it("repairs a failing pair to the target ratio", () => {
    const fixed = ensureContrast("#4cc9f0", "#ffffff");
    expect(fixed).not.toBeNull();
    expect(contrast(fixed!, "#ffffff")).toBeGreaterThanOrEqual(WCAG.AA_NORMAL);
  });

  it("hits higher targets when asked", () => {
    const fixed = ensureContrast("#4cc9f0", "#ffffff", { target: 7 });
    expect(contrast(fixed!, "#ffffff")).toBeGreaterThanOrEqual(7);
  });

  it("does not overshoot. It stops close to the target", () => {
    const fixed = ensureContrast("#4cc9f0", "#ffffff", { target: WCAG.AA_NORMAL })!;
    expect(contrast(fixed, "#ffffff")).toBeLessThan(WCAG.AA_NORMAL + 0.6);
  });

  it("preserves hue while adjusting lightness", () => {
    const source = "#4cc9f0";
    const fixed = ensureContrast(source, "#ffffff")!;
    const hueBefore = rgbToOklch(fromHex(source))[2];
    const hueAfter = rgbToOklch(fromHex(fixed))[2];
    // Still recognisably the same cyan, not shifted into another colour family.
    expect(Math.abs(hueAfter - hueBefore)).toBeLessThan(3);
  });

  it("goes lighter on dark backgrounds and darker on light ones", () => {
    const onDark = ensureContrast("#3a3f4b", "#08090c", { target: 4.5 })!;
    const onLight = ensureContrast("#c8ccd4", "#ffffff", { target: 4.5 })!;
    expect(relativeLuminance(onDark)).toBeGreaterThan(relativeLuminance("#3a3f4b"));
    expect(relativeLuminance(onLight)).toBeLessThan(relativeLuminance("#c8ccd4"));
  });

  it("returns null when the target is unreachable in the requested direction", () => {
    // Nothing lighter than white, so 7:1 lighter-than-white is impossible.
    expect(ensureContrast("#ffffff", "#ffffff", { target: 7, direction: "lighter" })).toBeNull();
  });
});
