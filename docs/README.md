# Documentation

**Not a developer, or new to any of this?** → **[Getting started](./getting-started.md)**.
It explains the whole tool with no jargon. Everything below assumes you write code.

| | |
|---|---|
| [**Getting started**](./getting-started.md) | Plain English, no jargon. What it does, what you'll see, what to do when it looks wrong. |
| [**Glossary**](./glossary.md) | Every technical term used anywhere in this project, explained from scratch. |
| [**Package README**](../packages/palette-forge/README.md) | Install, quick start, and a guided tour of every feature. |
| [**API reference**](./api.md) | Every export, with signatures, options and defaults. |
| [**CLI guide**](./cli.md) | Flags, input sources, exit codes, and tuning advice. |
| [**Recipes**](./recipes.md) | Twelve things to build: shadcn themes, CI accessibility gates, Worker extraction, OG images, placeholders. |
| [**Publishing & contributing**](./publishing.md) | Repo layout, build pipeline, release checklist, contribution rules. |

## The short version

```bash
npx palette-forge logo.png                                  # look
npx palette-forge logo.png -f shadcn -o app/globals.css     # ship
```

```ts
import { extractPaletteFromImage, toShadcn } from "palette-forge";

const palette = await extractPaletteFromImage(file);
toShadcn(palette);
```
