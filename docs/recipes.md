# Recipes

Practical things to build with `palette-forge`.

---

## 1. Generate a shadcn/ui theme from a logo

The shortest path from "here is our logo" to "here is our theme".

```bash
npx palette-forge brand/logo.png --format shadcn --out app/globals.css
```

Or as a script, so it regenerates whenever the logo changes:

```ts
// scripts/theme.ts
import { extractPaletteFromFile } from "palette-forge/node";
import { toShadcn } from "palette-forge";
import { writeFile } from "node:fs/promises";

const palette = await extractPaletteFromFile("brand/logo.png", {
  colors: 6,
  downweightNeutrals: true,
});

await writeFile(
  "app/globals.css",
  `@import "tailwindcss";\n\n${toShadcn(palette, { theme: { minContrast: 4.5 } })}\n`,
);
```

Every text/surface pair in the output is contrast-repaired before it is written, so the
theme passes AA by construction.

---

## 2. Fail CI when the brand palette breaks accessibility

Turn contrast into a test rather than a code-review comment.

```ts
// test/brand-contrast.test.ts
import { expect, test } from "vitest";
import { extractPaletteFromFile } from "palette-forge/node";
import { contrast, WCAG } from "palette-forge";

test("brand colours stay readable on our backgrounds", async () => {
  const palette = await extractPaletteFromFile("brand/logo.png", { colors: 5 });
  const primary = palette.byRole.primary?.[0];
  expect(primary).toBeDefined();

  // Body text on our two surfaces must clear AA.
  for (const background of ["#ffffff", "#0b0b0f"]) {
    const ratio = contrast(primary!.hex, background);
    expect(ratio, `${primary!.hex} on ${background}`).toBeGreaterThanOrEqual(WCAG.AA_LARGE);
  }
});
```

Because extraction is deterministic, this test is stable. It only fails when the logo
actually changes.

---

## 3. Repair a colour instead of arguing about it

```ts
import { contrast, ensureContrast, WCAG } from "palette-forge";

function accessible(brand: string, background: string) {
  if (contrast(brand, background) >= WCAG.AA_NORMAL) return brand;

  const repaired = ensureContrast(brand, background, { target: WCAG.AA_NORMAL });
  if (!repaired) {
    throw new Error(`No variant of ${brand} can reach 4.5:1 on ${background}`);
  }
  return repaired;
}

accessible("#4cc9f0", "#ffffff"); // "#0081a1", same hue, now readable
```

Hue is held and chroma is eased, so the result still reads as the brand colour rather than
as a different one.

---

## 4. Extract in a Web Worker

`extractPalette` is synchronous and pure, so it moves off the main thread with no ceremony.

```ts
// palette.worker.ts
import { extractPalette } from "palette-forge";

self.onmessage = (event: MessageEvent<{ data: ImageData; colors: number }>) => {
  const { data, colors } = event.data;
  self.postMessage(extractPalette(data, { colors }));
};
```

```ts
// main.ts
const worker = new Worker(new URL("./palette.worker.ts", import.meta.url), { type: "module" });

worker.postMessage({ data: imageData, colors: 6 }, [imageData.data.buffer]);
worker.onmessage = (event) => render(event.data);
```

`Palette` is a plain object tree, so it survives structured cloning intact.

---

## 5. Dominant-colour placeholders while images load

Cheaper than blurhash, and one round trip earlier.

```ts
// At build time or on upload:
import { extractPaletteFromFile } from "palette-forge/node";

const palette = await extractPaletteFromFile(imagePath, { colors: 3, maxDimension: 64 });
const placeholder = palette.swatches[0]!.hex;
// store `placeholder` alongside the image record
```

```tsx
<div style={{ background: placeholder }}>
  <img src={src} loading="lazy" onLoad={(e) => (e.currentTarget.style.opacity = "1")} />
</div>
```

Dropping `maxDimension` to 64 makes this fast enough to run on every upload.

---

## 6. Feed Style Dictionary, Tokens Studio or Figma Variables

The DTCG emitter produces the W3C interchange format all three read.

```bash
npx palette-forge logo.png -f dtcg -o tokens/color.json
```

```js
// style-dictionary.config.js
export default {
  source: ["tokens/**/*.json"],
  platforms: {
    css: { transformGroup: "css", files: [{ destination: "vars.css", format: "css/variables" }] },
    ios: { transformGroup: "ios", files: [{ destination: "Colors.swift", format: "ios-swift/class.swift" }] },
  },
};
```

---

## 7. A colour API on any server

```ts
// Hono, Express, Next route handler, same shape everywhere
import { extractPaletteFromBuffer } from "palette-forge/node";
import { emit } from "palette-forge";

app.post("/palette", async (c) => {
  const form = await c.req.formData();
  const file = form.get("image") as File;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const palette = await extractPaletteFromBuffer(bytes, { colors: 6 });
  return c.text(emit(palette, "css"), 200, { "content-type": "text/css" });
});
```

Cap the upload size before decoding. A decoder is a fine denial-of-service target.

---

## 8. Per-user themes from an avatar

```tsx
"use client";
import { usePalette } from "palette-forge/react";
import { deriveTheme } from "palette-forge";
import { useEffect } from "react";

export function AvatarTheme({ avatarUrl }: { avatarUrl: string }) {
  const { palette, load } = usePalette({ colors: 5, downweightNeutrals: true });

  useEffect(() => {
    void load(avatarUrl);
  }, [avatarUrl, load]);

  useEffect(() => {
    if (!palette) return;
    const theme = deriveTheme(palette);
    for (const [token, value] of Object.entries(theme.light)) {
      document.documentElement.style.setProperty(token, value);
    }
  }, [palette]);

  return null;
}
```

Because `deriveTheme` repairs contrast, a user with a near-white avatar still gets readable
text rather than an unusable page.

---

## 9. Brand-coloured OG images

```tsx
// app/og/route.tsx
import { ImageResponse } from "next/og";
import { extractPaletteFromUrl } from "palette-forge/node";
import { bestTextColor } from "palette-forge";

export async function GET(request: Request) {
  const logo = new URL(request.url).searchParams.get("logo")!;
  const palette = await extractPaletteFromUrl(logo, { colors: 3, downweightNeutrals: true });
  const brand = palette.byRole.primary?.[0]?.hex ?? "#4cc9f0";

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: brand, color: bestTextColor(brand) }}>
      …
    </div>,
    { width: 1200, height: 630 },
  );
}
```

`bestTextColor` uses the luminance crossover, so the caption stays readable whatever colour
comes back.

---

## 10. Snapshot your brand palette

Determinism makes this meaningful. The snapshot only changes when the artwork does.

```ts
import { expect, test } from "vitest";
import { extractPaletteFromFile } from "palette-forge/node";

test("brand palette is unchanged", async () => {
  const palette = await extractPaletteFromFile("brand/logo.png", { colors: 6 });
  expect(palette.swatches.map((s) => `${s.role}:${s.hex}`)).toMatchSnapshot();
});
```

A failing snapshot means someone changed the logo, which is usually worth knowing.

---

## 11. Build a ramp around one hand-picked colour

You do not need an image at all.

```ts
import { scale, neutralScale, harmony, toCSS } from "palette-forge";

const brand = "#4cc9f0";

const tokens = {
  ...scale(brand),                          // 50 to 950, brand anchored at its true stop
  ...neutralScale(brand, 0.02),             // greys with a hint of the brand hue
};

const [complement] = harmony.complementary(brand);
```

---

## 12. Check a palette before you commit to it

```ts
import { contrastMatrix } from "palette-forge";

const usable = contrastMatrix(["#4cc9f0", "#f0554c", "#0f121a", "#f8f9fb"])
  .filter((pair) => pair.aaNormal);

if (usable.length === 0) {
  console.warn("No pairing in this palette can carry body text.");
}
```

A palette where nothing clears 4.5:1 is a palette you will fight for the life of the
product.
