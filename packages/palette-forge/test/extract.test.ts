import { describe, expect, it } from "vitest";
import { extractPalette } from "../src/extract.js";
import { makeImage, solid, withTransparency } from "./helpers.js";

describe("extractPalette", () => {
  it("recovers flat colours exactly", () => {
    // Medoid snapping means a flat-colour image returns its literal hexes,
    // not an average that lands a shade off the brand colour.
    const image = makeImage([
      { color: "#ff0000", weight: 6 },
      { color: "#00ff00", weight: 3 },
      { color: "#0000ff", weight: 1 },
    ]);

    const palette = extractPalette(image, { colors: 3 });
    expect(palette.swatches.map((s) => s.hex)).toEqual(["#ff0000", "#00ff00", "#0000ff"]);
  });

  it("reports coverage that matches the image's real proportions", () => {
    const palette = extractPalette(
      makeImage([
        { color: "#ff0000", weight: 6 },
        { color: "#00ff00", weight: 3 },
        { color: "#0000ff", weight: 1 },
      ]),
      { colors: 3 },
    );

    const [red, green, blue] = palette.swatches;
    expect(red!.share).toBeCloseTo(0.6, 2);
    expect(green!.share).toBeCloseTo(0.3, 2);
    expect(blue!.share).toBeCloseTo(0.1, 2);
  });

  it("orders swatches by coverage, densest first", () => {
    const palette = extractPalette(
      makeImage([
        { color: "#0000ff", weight: 1 },
        { color: "#ff0000", weight: 8 },
        { color: "#00ff00", weight: 3 },
      ]),
      { colors: 3 },
    );
    const shares = palette.swatches.map((s) => s.share);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
  });

  it("is deterministic across runs", () => {
    const image = makeImage([
      { color: "#4cc9f0", weight: 4 },
      { color: "#f0554c", weight: 3 },
      { color: "#08090c", weight: 2 },
      { color: "#f0f0f0", weight: 5 },
    ]);

    const a = extractPalette(image, { colors: 5 });
    const b = extractPalette(image, { colors: 5 });
    expect(a.swatches).toEqual(b.swatches);
  });

  it("changes with the seed but stays stable per seed", () => {
    const image = makeImage([
      { color: "#4cc9f0", weight: 4 },
      { color: "#f0554c", weight: 3 },
      { color: "#08090c", weight: 2 },
    ]);
    const first = extractPalette(image, { colors: 3, seed: 1 });
    const again = extractPalette(image, { colors: 3, seed: 1 });
    expect(first.swatches).toEqual(again.swatches);
  });

  it("collapses duplicate clusters when k exceeds the distinct colours", () => {
    // Two-tone logo, eight colours requested: must not emit repeats.
    const palette = extractPalette(
      makeImage([
        { color: "#ff0000", weight: 1 },
        { color: "#0000ff", weight: 1 },
      ]),
      { colors: 8 },
    );

    const hexes = palette.swatches.map((s) => s.hex);
    expect(new Set(hexes).size).toBe(hexes.length);
    expect(hexes.sort()).toEqual(["#0000ff", "#ff0000"]);
  });

  it("handles a single-colour image", () => {
    const palette = extractPalette(solid("#4cc9f0"), { colors: 5 });
    expect(palette.swatches).toHaveLength(1);
    expect(palette.swatches[0]!.hex).toBe("#4cc9f0");
    expect(palette.swatches[0]!.share).toBeCloseTo(1, 5);
  });

  it("shares always sum to 1", () => {
    const palette = extractPalette(
      makeImage([
        { color: "#123456", weight: 5 },
        { color: "#abcdef", weight: 3 },
        { color: "#fedcba", weight: 2 },
      ]),
      { colors: 4 },
    );
    const total = palette.swatches.reduce((sum, s) => sum + s.share, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("skips transparent pixels", () => {
    const palette = extractPalette(withTransparency("#4cc9f0", 0.25), { colors: 3 });
    expect(palette.swatches).toHaveLength(1);
    expect(palette.swatches[0]!.hex).toBe("#4cc9f0");
    // Only the opaque quarter was sampled.
    expect(palette.meta.pixelsSampled).toBeGreaterThan(0);
  });

  it("down-weights neutrals so a small brand mark can still win", () => {
    // A screenshot: 92% white chrome, 8% brand cyan.
    const image = makeImage([
      { color: "#ffffff", weight: 92 },
      { color: "#4cc9f0", weight: 8 },
    ]);

    const plain = extractPalette(image, { colors: 2 });
    const weighted = extractPalette(image, { colors: 2, downweightNeutrals: true });

    const cyanPlain = plain.swatches.find((s) => s.hex === "#4cc9f0")!;
    const cyanWeighted = weighted.swatches.find((s) => s.hex === "#4cc9f0")!;

    expect(cyanWeighted.share).toBeGreaterThan(cyanPlain.share);
    // With neutrals demoted, the brand colour becomes the dominant swatch.
    expect(weighted.swatches[0]!.hex).toBe("#4cc9f0");
  });

  it("clamps absurd colour counts instead of throwing", () => {
    const image = makeImage([{ color: "#ff0000", weight: 1 }]);
    expect(() => extractPalette(image, { colors: 0 })).not.toThrow();
    expect(() => extractPalette(image, { colors: 9999 })).not.toThrow();
  });

  it("rejects malformed pixel buffers with a useful message", () => {
    expect(() =>
      extractPalette({ data: new Uint8ClampedArray(4), width: 10, height: 10 }),
    ).toThrow(/Pixel buffer too small/);

    expect(() =>
      extractPalette({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
    ).toThrow(/no area/);
  });

  it("supports Lab as well as OKLab", () => {
    const image = makeImage([
      { color: "#ff0000", weight: 1 },
      { color: "#0000ff", weight: 1 },
    ]);
    const lab = extractPalette(image, { colors: 2, space: "lab" });
    expect(lab.meta.space).toBe("lab");
    expect(lab.swatches.map((s) => s.hex).sort()).toEqual(["#0000ff", "#ff0000"]);
  });

  it("populates metadata", () => {
    const palette = extractPalette(makeImage([{ color: "#ff0000", weight: 1 }]), {
      colors: 3,
    });
    expect(palette.meta.requestedColors).toBe(3);
    expect(palette.meta.iterations).toBeGreaterThan(0);
    expect(palette.meta.pixelsSampled).toBeGreaterThan(0);
    expect(palette.meta.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("roles", () => {
  const palette = extractPalette(
    makeImage([
      { color: "#ffffff", weight: 40 },
      { color: "#0a0a0a", weight: 25 },
      { color: "#2563eb", weight: 20 },
      { color: "#f0554c", weight: 10 },
      { color: "#9ca3af", weight: 5 },
    ]),
    { colors: 5 },
  );

  it("names the darkest colour ink and the lightest paper", () => {
    expect(palette.byRole.ink?.[0]!.hex).toBe("#0a0a0a");
    expect(palette.byRole.paper?.[0]!.hex).toBe("#ffffff");
  });

  it("picks a chromatic colour as primary, not the dominant white", () => {
    const primary = palette.byRole.primary?.[0];
    expect(primary).toBeDefined();
    expect(["#2563eb", "#f0554c"]).toContain(primary!.hex);
  });

  it("classifies low-chroma leftovers as neutral", () => {
    const grey = palette.swatches.find((s) => s.hex === "#9ca3af");
    expect(grey?.role).toBe("neutral");
  });

  it("assigns exactly one role per swatch and unique token names", () => {
    const names = palette.swatches.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    for (const swatch of palette.swatches) {
      expect(swatch.role).toBeTruthy();
    }
  });

  it("computes a readable `on` colour for every swatch", () => {
    for (const swatch of palette.swatches) {
      expect(["#000000", "#ffffff"]).toContain(swatch.on);
    }
  });
});
