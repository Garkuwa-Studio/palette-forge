# Assets

| File | | Use |
|---|---|---|
| `logo.png` | 1376×768, 992 KB | **Master.** Full-quality original. Edit and re-export from this; don't embed it directly. |
| `hero.jpg` | 1200×669, 84 KB | **Embed this one.** What the READMEs use. |

## Why two files

The master is a PNG with smooth dark gradients, which PNG compresses badly. It is 992 KB for an
image that renders about 720 px wide. At JPEG q92 the same image is 84 KB, **11× smaller**,
and the difference is invisible at any size it's displayed.

That claim was checked rather than assumed. Running both through this project's own
extractor, the palette survives recompression within 1 to 3 units per channel:

```
$ npx palette-forge assets/logo.png --colors 5 -f json
  #0d1015  #46c2e4  #e6564d  #eea24a  #57e6a4

$ npx palette-forge assets/hero.jpg --colors 5 -f json
  #0d1017  #47c6ed  #e6564a  #eca049  #5ce6a6
```

Keep the PNG as the master anyway. Re-encoding a JPEG compounds its artefacts, so future
exports should start from `logo.png`.

## The brand palette is the source of truth

`logo.png` was image-generated (see [`../dalu.md`](../dalu.md)), and generated colours drift
from the hexes you ask for. Sampling the logo gives `#47c7ee`; the brand cyan is `#4cc9f0`.

**Always take brand colours from the palette below, never by eyedropping the artwork.**

| | Hex |
|---|---|
| Accent / brand | `#4cc9f0` |
| Bad | `#f0554c` |
| Warn | `#f0a44c` |
| Ok | `#4cf0a8` |
| Background | `#08090c` |
| Surface | `#0e1015` |

These live in `apps/web/app/globals.css` as `--pf-*` tokens.

## Icons

The favicon and Apple touch icon are **not** derived from these files. They are generated
from code so they stay crisp at every size:

| | |
|---|---|
| `apps/web/app/icon.svg` | Favicon. Four bars, not the logo's five: the fifth is charcoal and vanishes into the dark ground at 16 px, and dropping it gives the rest the width they need to stay distinct. |
| `apps/web/app/apple-icon.tsx` | 180×180 touch icon, rendered at request time. |

## Not shipped to npm

`assets/` is outside the package's `files` allowlist, so none of this reaches the tarball.
A decorative megabyte on every `npm install` would be a poor trade. The package README
references the hero over `raw.githubusercontent.com`, which is also what npm needs, since it
does not resolve relative image paths.
