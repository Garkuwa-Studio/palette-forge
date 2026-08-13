# API reference

Complete reference for `palette-forge`. For a guided tour, start with the
[package README](../packages/palette-forge/README.md).

Three entry points:

```ts
import { … } from "palette-forge";        // core, browser and Node safe
import { … } from "palette-forge/react";  // React hooks
import { … } from "palette-forge/node";   // Node file/buffer/URL decoding
```

---

## Types

### `RGB` · `HSL` · `Lab` · `OKLab` · `OKLCH`

Readonly 3-tuples. Plain tuples rather than class instances, so results stay
JSON-serialisable and safe to post across a Worker boundary.

| Type | Ranges |
|---|---|
| `RGB` | 0 to 255 per channel |
| `HSL` | `h` 0 to 360, `s`/`l` 0 to 100 |
| `Lab` | `l` 0 to 100, `a`/`b` ≈ −128 to 128 |
| `OKLab` | `l` 0 to 1, `a`/`b` ≈ −0.4 to 0.4 |
| `OKLCH` | `l` 0 to 1, `c` 0 to ≈0.4, `h` 0 to 360 |

### `Swatch`

```ts
interface Swatch {
  hex: string;        // lowercase 6-digit, e.g. "#4cc9f0"
  rgb: RGB;
  hsl: HSL;
  oklch: OKLCH;
  share: number;      // 0 to 1, fraction of weighted pixels
  role: Role;
  name: string;       // token-safe and unique: "primary", "support-2"
  luminance: number;  // WCAG relative luminance, 0 to 1
  on: string;         // "#000000" or "#ffffff", readable text on this colour
}
```

### `Role`

`"primary" | "accent" | "ink" | "paper" | "neutral" | "support"`

`ink` and `paper` are the darkest and lightest members. They are the pair a text/background system
is built on. `primary` and `accent` are the two most brand-carrying chromatic colours.
Everything else is `neutral` (low chroma) or `support`.

### `Palette`

```ts
interface Palette {
  swatches: Swatch[];                      // ordered by coverage, densest first
  byRole: Partial<Record<Role, Swatch[]>>; // roles with no members are absent
  meta: PaletteMeta;
}

interface PaletteMeta {
  pixelsSampled: number;   // opaque pixels fed to the clusterer
  sampledWidth: number;
  sampledHeight: number;
  iterations: number;      // Lloyd iterations before convergence
  requestedColors: number; // may exceed swatches.length after pruning
  space: ColorSpace;
  seed: number;
  durationMs: number;
}
```

### `PixelSource`

```ts
interface PixelSource {
  data: Uint8ClampedArray | Uint8Array;  // RGBA, length width * height * 4
  width: number;
  height: number;
}
```

Structurally compatible with `ImageData`, so a canvas result works directly.

### `ContrastResult`

```ts
interface ContrastResult {
  foreground: string;
  background: string;
  ratio: number;         // 1 to 21, 2dp
  aaNormal: boolean;     // ≥ 4.5
  aaLarge: boolean;      // ≥ 3
  aaaNormal: boolean;    // ≥ 7
  aaaLarge: boolean;     // ≥ 4.5
  uiComponent: boolean;  // ≥ 3, for icons, borders, focus rings (SC 1.4.11)
  level: "AAA" | "AA" | "fail";
}
```

---

## Extraction

### `extractPalette(source, options?): Palette`

Synchronous and pure. Same input, same output, always.

```ts
const palette = extractPalette(ctx.getImageData(0, 0, w, h), { colors: 6 });
```

Throws `RangeError` if the buffer is smaller than `width * height * 4`, or if the image has
no area.

### `ExtractOptions`

| Option | Type | Default | Notes |
|---|---|---|---|
| `colors` | `number` | `6` | Clusters to solve for. Clamped to 1 to 24. |
| `maxDimension` | `number` | `160` | Longest edge sampled. Cost is roughly quadratic. |
| `space` | `"oklab" \| "lab"` | `"oklab"` | Distance metric space. |
| `maxIterations` | `number` | `24` | Lloyd iterations. Stops early on convergence. |
| `seed` | `number` | `0x5eed` | k-means++ seed. |
| `downweightNeutrals` | `boolean` | `false` | Demote greys and near-black/white. |
| `alphaThreshold` | `number` | `125` | Alpha below this counts as transparent. |
| `minShare` | `number` | `0.004` | Drop clusters below this share. |

Exported as `DEFAULT_OPTIONS`.

### `extractPaletteFromImage(input, options?): Promise<Palette>`

Browser convenience. `input` may be an `HTMLImageElement`, `HTMLCanvasElement`,
`ImageBitmap`, `Blob`, `File`, or a URL string.

### `toPixelSource(input, maxDimension?): Promise<PixelSource>`

Rasterise without clustering. Defaults to a 512px cap. A 6000×4000 photo is 96 MB of RGBA,
enough to fail outright on a phone.

Image smoothing is disabled during the downscale on purpose: bilinear resampling blends
adjacent colours into intermediates that were never in the image, and those intermediates
are exactly what a palette extractor must not invent.

### `canRasterise(): boolean`

Whether this environment has a canvas (browser or Worker).

---

## Colour conversion

sRGB is the hub; every other space converts to and from it.

| Function | |
|---|---|
| `toHex(rgb)` | → lowercase 6-digit hex. Clamps and rounds. |
| `fromHex(hex)` | Accepts `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, with or without `#`. Alpha is parsed and discarded. Throws `TypeError` on anything else. |
| `isHex(string)` | Non-throwing validity check. |
| `toLinear(channel)` / `fromLinear(channel)` | sRGB transfer function, both directions. |
| `rgbToHsl` / `hslToRgb` | HSL is rounded to whole degrees and percents. |
| `rgbToLab` / `labToRgb` | CIELAB, D65. |
| `rgbToXyz` / `xyzToRgb` | CIE XYZ, D65. |
| `rgbToOklab` / `oklabToRgb` | OKLab. May return out-of-gamut channels. |
| `rgbToOklch` / `oklchToRgb` | OKLCH. Hue is pinned to 0 at zero chroma so greys compare equal. |
| `oklabToOklch` / `oklchToOklab` | |
| `formatOklch(oklch, precision?)` | → `"oklch(78.2% 0.121 222.5)"` |
| `distanceSq(a, b)` | Squared euclidean distance, the k-means metric, no `sqrt`. |
| `clamp255(n)` | Clamp and round to 0 to 255. |

---

## Contrast

### `contrast(a, b): number`

Ratio, 1 to 21, 2dp. Order-independent. Accepts hex strings or `RGB`.

### `relativeLuminance(color): number`

WCAG 2.1 relative luminance, 0 to 1.

### `evaluateContrast(fg, bg): ContrastResult`

Full conformance breakdown.

### `contrastMatrix(colors, options?): ContrastResult[]`

Every unordered pairing, ranked by ratio, with the darker colour as foreground.

```ts
contrastMatrix(hexes, { minRatio: 1.6, limit: 20 });
```

### `bestTextColor(background): "#000000" | "#ffffff"`

Uses the 0.179 luminance crossover, where black and white contrast equally. Using that
rather than a naive lightness check is what stops mid-tone blues and reds from getting
unreadable white text.

### `mostReadable(background, candidates): string`

Highest-contrast candidate.

### `ensureContrast(fg, bg, options?): string | null`

Walks the foreground's OKLab lightness until it clears `target`, holding hue and easing
chroma. Returns `null` when the target genuinely cannot be reached in that hue.

| Option | Default | |
|---|---|---|
| `target` | `4.5` | Ratio to reach. |
| `direction` | `"auto"` | `"auto"` moves away from the background. Or `"lighter"` / `"darker"`. |
| `preserveChroma` | `false` | Hold chroma fixed instead of letting gamut mapping reduce it. |

The search is quantised to 8-bit at every step, not at the end. Searching in float space
and rounding afterwards can drop the answer back below the target.

### `WCAG`

```ts
{ AA_NORMAL: 4.5, AA_LARGE: 3, AAA_NORMAL: 7, AAA_LARGE: 4.5, UI_COMPONENT: 3 }
```

---

## Gamut

### `inGamut(rgb): boolean`

### `clipToGamut(oklch): OKLCH`

Reduces chroma until the colour fits sRGB, preserving lightness and hue. Naively clamping
RGB channels shifts hue badly, so a clipped blue skews purple.

### `oklchToRgbClipped(oklch): RGB`

### `maxChroma(lightness, hue): number`

Largest chroma that fits sRGB at that lightness and hue.

---

## Scales

### `scale(color, options?): ToneScale`

11 stops: `50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`.

| Option | Default | |
|---|---|---|
| `anchor` | `true` | Pin the input colour verbatim at its nearest stop. |
| `saturation` | `1` | Multiply all chroma. Below 1 is muted; above pushes toward the gamut edge. |
| `hueShift` | `0` | Degrees rotated across the ramp, light end to dark. A small negative value mimics how pigments cool as they darken. |

Lightness targets are tuned close to Tailwind v4 and Radix, so generated ramps drop into an
existing system without clashing with the greys already there.

### `neutralScale(color, tint?): ToneScale`

Greys carrying a trace of the brand hue. Default `tint` is `0.03`.

### `rotateHue(color, degrees): string`

### `harmony`

`complementary` · `analogous` · `triadic` · `tetradic` · `splitComplementary`. All computed
in OKLCH, so lightness stays constant across the set.

### `nearestStop(color): ToneStop` · `TONE_STOPS`

---

## Roles

### `assignRoles(candidates): Role[]`

Takes `{ rgb, oklch, share }[]`, returns one role per candidate in the same order. Roles are
exclusive. Structural roles (`ink`, `paper`) are claimed first, because a system without a
readable text/background pair is broken in a way that one without an `accent` is not.

### `nameSwatches(roles): string[]`

`["primary", "support", "support-2", …]`. The first holder of a role gets the bare name;
collisions are suffixed.

---

## Theme

### `deriveTheme(palette, options?): DerivedTheme`

Builds tonal ramps from the brand colours and assigns them to the semantic slots shared by
shadcn/ui, Radix Themes and most in-house systems. Every text/surface pair is
contrast-checked and repaired.

| Option | Default | |
|---|---|---|
| `primary` | palette's `primary` | Override the brand colour. |
| `accent` | palette's `accent` | |
| `destructiveHue` | `27` | Hue for error states. |
| `minContrast` | `4.5` | Floor enforced on every text/surface pair. |
| `neutralTint` | `0.03` | Brand hue bleed into the greys. |
| `radius` | `"0.625rem"` | |

```ts
{ light: Record<string, string>,
  dark: Record<string, string>,
  scales: { primary, accent, neutral, destructive } }
```

---

## Formats

### `emit(palette, format, options?): string`

`format` is one of `css` `tailwind` `scss` `ts` `js` `json` `dtcg` `shadcn` `svg`. Throws
`TypeError` on an unknown format.

Named exports: `toCSS` `toTailwind` `toSCSS` `toTypeScript` `toJavaScript` `toJSON`
`toDTCG` `toShadcn` `toSVG`.

### `EmitOptions`

| Option | | Notes |
|---|---|---|
| `prefix` | `string` | `"brand"` → `--brand-primary` |
| `scales` | `boolean` | Emit full 50 to 950 ramps. Per-format default. |
| `oklch` | `boolean` | Emit `oklch()` instead of hex. Per-format default. |
| `header` | `boolean` | Provenance comment. Default `true`. |
| `theme` | `ThemeOptions` | Forwarded to `deriveTheme` by the `shadcn` emitter. |

Each format keeps its own defaults. Tailwind emits `oklch()` ramps because that is what
Tailwind v4 itself ships; plain CSS emits flat hex. Only pass `scales`/`oklch` when you mean
to override.

### `emitters` · `extensions`

Lookup maps keyed by format name.

---

## React

### `usePalette(options?): UsePaletteResult`

```ts
{
  palette: Palette | null;
  status: "idle" | "loading" | "ready" | "error";
  error: Error | null;
  preview: string | null;      // object URL, revoked on reset/unmount
  source: PixelSource | null;  // cached pixels
  load: (input: ImageInput) => Promise<void>;
  reextract: () => void;
  reset: () => void;
}
```

Decoded pixels are cached separately from the palette, so an options change re-clusters
without re-decoding. Stale loads are discarded by token, so a slow first load cannot
overwrite a fast second one. Options are compared by value, so an inline object literal does
not trigger re-extraction on every render.

### `useDropzone(options): UseDropzoneResult`

| Option | Default | |
|---|---|---|
| `onFile` | (required) | Required. |
| `accept` | `"image/"` | MIME prefix. |
| `paste` | `true` | Global paste listener. |
| `maxBytes` | 25 MB | |
| `onReject` | (none) | `(reason, file?) => void` |
| `disabled` | `false` | |

Returns `{ isOver, rootProps, inputProps, open }`. Spread `rootProps` on the drop target and
`inputProps` on a hidden `<input type="file">`.

---

## Node

| Function | |
|---|---|
| `extractPaletteFromFile(path, options?)` | |
| `extractPaletteFromBuffer(bytes, options?, hint?)` | |
| `extractPaletteFromUrl(url, options?)` | |
| `decodeImage(bytes, hint?)` | → `PixelSource` |
| `NATIVE_FORMATS` | `["png", "jpg", "jpeg"]` |
| `SHARP_FORMATS` | `["webp", "avif", "tiff", "tif", "gif", "heic", "heif"]` |

Format is identified from magic bytes; the `hint` (a filename or extension) is only
consulted when sniffing is inconclusive. Formats outside `NATIVE_FORMATS` are delegated to
`sharp` if installed, and produce an actionable error if not.

---

## Internals

Exported for people building their own pipelines.

| | |
|---|---|
| `samplePixels(source, options)` | → `SampledPixels`, weighted and deduplicated |
| `kmeans(sample, options)` | → `{ clusters, iterations }` |
| `mulberry32(seed)` | The deterministic PRNG |
