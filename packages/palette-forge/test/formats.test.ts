import { describe, expect, it } from "vitest";
import { extractPalette } from "../src/extract.js";
import {
  emit,
  emitters,
  extensions,
  toCSS,
  toDTCG,
  toJSON,
  toSCSS,
  toShadcn,
  toSVG,
  toTailwind,
  toTypeScript,
  type TokenFormat,
} from "../src/formats/index.js";
import { deriveTheme } from "../src/theme.js";
import { contrast, WCAG } from "../src/color/contrast.js";
import { makeImage } from "./helpers.js";

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

describe("toCSS", () => {
  it("emits custom properties on :root", () => {
    const css = toCSS(palette);
    expect(css).toContain(":root {");
    expect(css).toMatch(/--primary: #[0-9a-f]{6};/);
    expect(css.trimEnd().endsWith("}")).toBe(true);
  });

  it("applies a prefix", () => {
    expect(toCSS(palette, { prefix: "brand" })).toContain("--brand-primary:");
  });

  it("can emit oklch values", () => {
    expect(toCSS(palette, { oklch: true })).toMatch(/--primary: oklch\(/);
  });

  it("can emit full ramps", () => {
    const css = toCSS(palette, { scales: true });
    expect(css).toContain("--primary-500:");
    expect(css).toContain("--primary-950:");
  });

  it("omits the header when asked", () => {
    expect(toCSS(palette, { header: false })).not.toContain("Palette Forge");
  });
});

describe("toTailwind", () => {
  it("emits a v4 @theme block with ramps", () => {
    const css = toTailwind(palette);
    expect(css).toContain("@theme {");
    expect(css).toContain('@import "tailwindcss";');
    expect(css).toMatch(/--color-primary-500: oklch\(/);
  });

  it("can emit flat colours only", () => {
    const css = toTailwind(palette, { scales: false });
    expect(css).not.toContain("-500:");
    expect(css).toMatch(/--color-primary: /);
  });
});

describe("toSCSS", () => {
  it("emits variables and optional maps", () => {
    expect(toSCSS(palette)).toMatch(/\$primary: #[0-9a-f]{6};/);
    const withScales = toSCSS(palette, { scales: true });
    expect(withScales).toContain("$primary-scale: (");
    expect(withScales).toContain("500:");
  });
});

describe("toTypeScript", () => {
  it("emits a const object and a key type", () => {
    const ts = toTypeScript(palette);
    expect(ts).toContain("export const palette = {");
    expect(ts).toContain("} as const;");
    expect(ts).toContain("export type PaletteToken = keyof typeof palette;");
  });

  it("quotes keys that are not valid identifiers", () => {
    const ts = toTypeScript(palette);
    // Suffixed role names like `support-2` must be quoted to parse.
    for (const match of ts.matchAll(/^ {2}(.+?):/gm)) {
      const key = match[1]!;
      if (key.includes("-")) expect(key.startsWith('"')).toBe(true);
    }
  });
});

describe("toJSON", () => {
  it("is valid JSON carrying colours, contrast and meta", () => {
    const parsed = JSON.parse(toJSON(palette));
    expect(Array.isArray(parsed.colors)).toBe(true);
    expect(parsed.colors[0]).toHaveProperty("hex");
    expect(parsed.colors[0]).toHaveProperty("role");
    expect(parsed.colors[0]).toHaveProperty("coverage");
    expect(Array.isArray(parsed.contrast)).toBe(true);
    expect(parsed.meta).toHaveProperty("space");
  });
});

describe("toDTCG", () => {
  it("emits W3C design-token groups", () => {
    const parsed = JSON.parse(toDTCG(palette));
    const primary = parsed.color.primary;
    expect(primary.$type).toBe("color");
    expect(primary["500"].$value).toMatch(/^#[0-9a-f]{6}$/);
    expect(primary.DEFAULT.$value).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("can emit flat tokens", () => {
    const parsed = JSON.parse(toDTCG(palette, { scales: false }));
    expect(parsed.color.primary.$value).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("toShadcn", () => {
  const css = toShadcn(palette);

  it("emits :root, .dark and an @theme inline bridge", () => {
    expect(css).toContain(":root {");
    expect(css).toContain(".dark {");
    expect(css).toContain("@theme inline {");
    expect(css).toContain("--color-primary: var(--primary);");
  });

  it("covers the full shadcn token set", () => {
    for (const token of [
      "--background",
      "--foreground",
      "--card",
      "--popover",
      "--primary",
      "--primary-foreground",
      "--secondary",
      "--muted",
      "--muted-foreground",
      "--accent",
      "--destructive",
      "--border",
      "--input",
      "--ring",
      "--radius",
    ]) {
      expect(css).toContain(`${token}:`);
    }
  });
});

describe("toSVG", () => {
  it("emits a well-formed swatch card", () => {
    const svg = toSVG(palette);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    // One rect per swatch, plus the background.
    expect(svg.match(/<rect/g)!.length).toBe(palette.swatches.length + 1);
  });
});

describe("emit()", () => {
  it("dispatches every declared format", () => {
    for (const format of Object.keys(emitters) as TokenFormat[]) {
      const output = emit(palette, format);
      expect(typeof output).toBe("string");
      expect(output.length).toBeGreaterThan(0);
      expect(extensions[format]).toBeTruthy();
    }
  });

  it("throws helpfully on an unknown format", () => {
    expect(() => emit(palette, "toml" as TokenFormat)).toThrow(/Unknown format/);
  });
});

describe("deriveTheme", () => {
  const theme = deriveTheme(palette);

  it("passes AA for every text/surface pair it defines", () => {
    const pairs: Array<[string, string]> = [
      ["--foreground", "--background"],
      ["--card-foreground", "--card"],
      ["--popover-foreground", "--popover"],
      ["--primary-foreground", "--primary"],
      ["--secondary-foreground", "--secondary"],
      ["--muted-foreground", "--muted"],
      ["--accent-foreground", "--accent"],
      ["--destructive-foreground", "--destructive"],
    ];

    for (const mode of ["light", "dark"] as const) {
      for (const [fg, bg] of pairs) {
        const ratio = contrast(theme[mode][fg]!, theme[mode][bg]!);
        expect(
          ratio,
          `${mode} ${fg} on ${bg} = ${ratio}:1 (${theme[mode][fg]} / ${theme[mode][bg]})`,
        ).toBeGreaterThanOrEqual(WCAG.AA_NORMAL);
      }
    }
  });

  it("honours a raised contrast floor", () => {
    const strict = deriveTheme(palette, { minContrast: 7 });
    expect(contrast(strict.light["--muted-foreground"]!, strict.light["--muted"]!))
      .toBeGreaterThanOrEqual(7);
  });

  it("inverts sensibly between light and dark", () => {
    expect(theme.light["--background"]).not.toBe(theme.dark["--background"]);
    expect(contrast(theme.dark["--foreground"]!, theme.dark["--background"]!))
      .toBeGreaterThan(4.5);
  });

  it("lets the brand colour be overridden", () => {
    const forced = deriveTheme(palette, { primary: "#4cc9f0" });
    expect(forced.scales.primary[500]).toBeTruthy();
    expect(forced.light["--primary"]).not.toBe(theme.light["--primary"]);
  });

  it("exposes the ramps it built", () => {
    expect(Object.keys(theme.scales)).toEqual(["primary", "accent", "neutral", "destructive"]);
  });
});
