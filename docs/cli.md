# CLI guide

```bash
npx palette-forge <image|url> [options]
```

No install needed. If you use it often:

```bash
npm install -g palette-forge
```

---

## Default output

With no `--format`, the CLI pretty-prints the palette in 24-bit terminal colour:

```
$ palette-forge brand.png --colors 5

  brand.png  5 colours

  ██████  #F8F9FB  paper     56.4%  on black 19.93:1 AAA
  ██████  #0F121A  ink       16.0%  on white 18.72:1 AAA
  ██████  #9CA3AF  neutral   12.7%  on black  8.27:1 AAA
  ██████  #4CC9F0  primary   11.6%  on black 10.92:1 AAA
  ██████  #F0554C  accent     3.3%  on black  6.11:1 AA

  13,400 px sampled · 2 iterations · 2.56ms · oklab
```

Each row shows the colour, its hex, the inferred role, its coverage, and the best contrast
it achieves against black or white with the WCAG level that earns.

Colour is disabled automatically when `NO_COLOR` is set, when `TERM=dumb`, or when stdout is
piped, so redirecting to a file gives you clean text, not escape codes.

---

## Options

| Flag | | Default |
|---|---|---|
| `-c, --colors <n>` | Colours to extract, 1 to 24 | `6` |
| `-f, --format <name>` | `css` `tailwind` `scss` `ts` `js` `json` `dtcg` `shadcn` `svg` | pretty print |
| `-o, --out <file>` | Write to a file instead of stdout | |
| `-p, --prefix <name>` | Prefix token names | |
| `--scales` | Emit full 50 to 950 ramps | per-format |
| `--oklch` | Emit `oklch()` instead of hex | per-format |
| `--neutrals` | Down-weight greys so brand colours surface | off |
| `--seed <n>` | Clustering seed | `24301` |
| `--space <name>` | `oklab` or `lab` | `oklab` |
| `--max-dimension <n>` | Sampling resolution | `160` |
| `--contrast` | Also print the WCAG contrast matrix | off |
| `-h, --help` | | |
| `-v, --version` | | |

`--scales` and `--oklch` have no default on purpose. Each format has its own. Tailwind
wants ramps and `oklch()`, plain CSS does not, and passing a flag overrides that format's
choice.

---

## Input sources

```javascript
palette-forge logo.png                          # a file
palette-forge https://example.com/hero.jpg      # a URL
cat logo.png | palette-forge -                  # stdin
```

PNG and JPEG decode with no extra dependencies. WebP, AVIF, TIFF, GIF and HEIC need `sharp`
installed alongside; the CLI tells you so if it hits one.

Format is detected from magic bytes, so a mislabelled extension still works.

---

## Recipes

**Generate a shadcn/ui theme**

```javascript
palette-forge logo.png --format shadcn --out app/globals.css
```

**Tailwind v4 theme with ramps**

```javascript
palette-forge logo.png -f tailwind -o app/theme.css
```

**Audit a screenshot's accessibility**

```bash
palette-forge screenshot.png --colors 8 --neutrals --contrast
```

**Pull brand colours out of a live site's OG image**

```bash
palette-forge https://example.com/og.png -c 5 --neutrals
```

**Pipe JSON into `jq`**

```bash
palette-forge logo.png -f json | jq -r '.colors[] | "\(.role)\t\(.hex)\t\(.coverage)%"'
```

**Get just the brand colour**

```bash
palette-forge logo.png -f json | jq -r '.colors[] | select(.role=="primary") | .hex'
```

**Regenerate tokens whenever the logo changes**

```json
{
  "scripts": {
    "tokens": "palette-forge assets/logo.png -f tailwind --scales -o app/theme.css"
  }
}
```

**Make a palette card for a README or PR**

```bash
palette-forge logo.png -f svg -o docs/palette.svg
```

---

## Exit codes

| | |
|---|---|
| `0` | Success |
| `1` | Bad arguments, unreadable input, or no colours found |

Errors go to stderr, so `--format` output on stdout stays pipe-safe even when something
fails.

---

## Tuning the extraction

**Too many near-identical colours?** Lower `--colors`. Clustering splits whatever budget you
give it, so asking for 12 colours from a two-tone logo produces near-duplicates (which are
then merged, so you may simply get fewer swatches back than requested, which is correct
behaviour rather than a bug).

**Brand colour missing from a screenshot?** Add `--neutrals`. UI screenshots are mostly white
and grey; without it, the chrome wins every cluster.

**Want a different take on the same image?** Change `--seed`. k-means++ seeding is
deterministic per seed, so this gives a reproducible alternative rather than a random one.

**Fine detail being missed?** Raise `--max-dimension`. Cost is roughly quadratic, so 320 is
about four times the work of 160, still only a few milliseconds.
