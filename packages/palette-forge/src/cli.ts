#!/usr/bin/env node

/**
 * The `palette-forge` command.
 *
 * Prints a palette to the terminal by default (truecolor blocks, hexes, coverage
 * and the AA/AAA verdict for text on each swatch), or writes design tokens in
 * any supported format with `--format`.
 */

import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  extractPaletteFromBuffer,
  extractPaletteFromFile,
  extractPaletteFromUrl,
} from "./node/index.js";
import { contrast, evaluateContrast } from "./color/contrast.js";
import { emit, extensions, type TokenFormat } from "./formats/index.js";
import type { ExtractOptions, Palette } from "./types.js";

const VERSION = "0.1.0";

/* ------------------------------------------------------------- styling --- */

/**
 * Respect NO_COLOR and non-TTY pipes. A CLI that dumps escape codes into a file
 * when its output is redirected is a CLI people stop using.
 */
const useColor =
  process.stdout.isTTY === true && !process.env.NO_COLOR && process.env.TERM !== "dumb";

const dim = (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s);
const bold = (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s);
const red = (s: string) => (useColor ? `\x1b[31m${s}\x1b[0m` : s);
const green = (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s);
const yellow = (s: string) => (useColor ? `\x1b[33m${s}\x1b[0m` : s);

/** A block of the given colour, using 24-bit terminal colour. */
function block(hex: string, width = 6): string {
  if (!useColor) return "".padEnd(width, "#");
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[48;2;${r};${g};${b}m${" ".repeat(width)}\x1b[0m`;
}

const HELP = `
${bold("palette-forge")} ${dim(`v${VERSION}`)}
Extract a brand palette from an image and emit design tokens.

${bold("USAGE")}
  palette-forge <image|url> [options]
  cat logo.png | palette-forge - [options]

${bold("OPTIONS")}
  -c, --colors <n>      Number of colours to extract (1-24)      ${dim("[default: 6]")}
  -f, --format <name>   css | tailwind | scss | ts | js | json |
                        dtcg | shadcn | svg                      ${dim("[default: pretty print]")}
  -o, --out <file>      Write to a file instead of stdout
  -p, --prefix <name>   Prefix token names, e.g. --prefix brand
      --scales          Emit full 50-950 ramps for each colour
      --oklch           Emit oklch() values instead of hex
      --neutrals        Down-weight greys so brand colours surface
      --seed <n>        Clustering seed                          ${dim("[default: 24301]")}
      --space <name>    oklab | lab                              ${dim("[default: oklab]")}
      --max-dimension <n>  Sampling resolution                   ${dim("[default: 160]")}
      --contrast        Print the WCAG contrast matrix
  -h, --help            Show this help
  -v, --version         Show version

${bold("EXAMPLES")}
  ${dim("# Look at a palette")}
  palette-forge logo.png

  ${dim("# Generate a shadcn/ui theme")}
  palette-forge logo.png --format shadcn --out app/globals.css

  ${dim("# Tailwind v4 theme with full ramps, from a URL")}
  palette-forge https://example.com/hero.jpg -f tailwind --scales -o theme.css

  ${dim("# Check the palette's accessibility")}
  palette-forge screenshot.png --colors 8 --neutrals --contrast
`;

/* --------------------------------------------------------------- output --- */

function printPalette(palette: Palette, label: string): void {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  ${bold(label)}  ${dim(`${palette.swatches.length} colours`)}`);
  lines.push("");

  const nameWidth = Math.max(...palette.swatches.map((s) => s.name.length), 7);

  for (const swatch of palette.swatches) {
    const coverage = `${(swatch.share * 100).toFixed(1)}%`.padStart(6);
    const onWhite = contrast(swatch.hex, "#ffffff");
    const onBlack = contrast(swatch.hex, "#000000");
    const best = onWhite >= onBlack ? `on white ${onWhite}:1` : `on black ${onBlack}:1`;
    const level = evaluateContrast(swatch.hex, onWhite >= onBlack ? "#ffffff" : "#000000").level;
    const badge = level === "fail" ? red("fail") : level === "AA" ? yellow("AA ") : green("AAA");

    lines.push(
      `  ${block(swatch.hex)}  ${bold(swatch.hex.toUpperCase())}  ` +
        `${swatch.name.padEnd(nameWidth)}  ${dim(coverage)}  ${dim(best)} ${badge}`,
    );
  }

  lines.push("");
  lines.push(
    dim(
      `  ${palette.meta.pixelsSampled.toLocaleString()} px sampled · ` +
        `${palette.meta.iterations} iterations · ${palette.meta.durationMs}ms · ` +
        `${palette.meta.space}`,
    ),
  );
  lines.push("");
  process.stdout.write(lines.join("\n"));
}

function printContrastMatrix(palette: Palette): void {
  const lines: string[] = [];
  lines.push(`  ${bold("Contrast matrix")} ${dim(" WCAG 2.1")}`);
  lines.push("");
  lines.push(
    dim(`  ${"foreground".padEnd(11)}${"background".padEnd(13)}${"ratio".padEnd(9)}level`),
  );

  const results = palette.swatches
    .flatMap((fg, i) =>
      palette.swatches.slice(i + 1).map((bg) => evaluateContrast(fg.hex, bg.hex)),
    )
    .sort((a, b) => b.ratio - a.ratio);

  for (const result of results) {
    const badge =
      result.level === "fail"
        ? result.aaLarge
          ? yellow("large text only")
          : red("fail")
        : result.level === "AAA"
          ? green("AAA")
          : green("AA");
    lines.push(
      `  ${block(result.foreground, 2)} ${result.foreground.toUpperCase()}  ` +
        `${block(result.background, 2)} ${result.background.toUpperCase()}  ` +
        `${`${result.ratio}:1`.padEnd(9)}${badge}`,
    );
  }

  lines.push("");
  process.stdout.write(lines.join("\n"));
}

/** Read piped stdin, for `cat logo.png | palette-forge -`. */
async function readStdin(): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Uint8Array);
  if (chunks.length === 0) throw new Error("No data on stdin");
  return Buffer.concat(chunks);
}

/* ----------------------------------------------------------------- main --- */

async function main(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        colors: { type: "string", short: "c" },
        format: { type: "string", short: "f" },
        out: { type: "string", short: "o" },
        prefix: { type: "string", short: "p" },
        // `scales` and `oklch` deliberately have no default: each format has its
        // own sensible default (Tailwind wants ramps and oklch, plain CSS does
        // not), and passing `false` here would silently override them.
        scales: { type: "boolean" },
        oklch: { type: "boolean" },
        neutrals: { type: "boolean", default: false },
        seed: { type: "string" },
        space: { type: "string" },
        "max-dimension": { type: "string" },
        contrast: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
    });
  } catch (error) {
    process.stderr.write(`${red("error")} ${(error as Error).message}\n`);
    process.stderr.write(`Run ${bold("palette-forge --help")} for usage.\n`);
    return 1;
  }

  const { values, positionals } = parsed;

  if (values.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (values.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }

  const input = positionals[0];
  if (!input) {
    process.stdout.write(HELP);
    return 1;
  }

  const numeric = (raw: string | undefined, name: string): number | undefined => {
    if (raw === undefined) return undefined;
    const parsedValue = Number(raw);
    if (!Number.isFinite(parsedValue)) {
      throw new Error(`--${name} expects a number, got ${JSON.stringify(raw)}`);
    }
    return parsedValue;
  };

  const format = values.format as TokenFormat | undefined;
  if (format && !(format in extensions)) {
    process.stderr.write(
      `${red("error")} unknown format ${JSON.stringify(format)}. ` +
        `Expected one of: ${Object.keys(extensions).join(", ")}\n`,
    );
    return 1;
  }

  if (values.space && values.space !== "oklab" && values.space !== "lab") {
    process.stderr.write(`${red("error")} --space expects "oklab" or "lab"\n`);
    return 1;
  }

  const options: ExtractOptions = {
    colors: numeric(values.colors, "colors") ?? 6,
    downweightNeutrals: values.neutrals,
    ...(values.seed !== undefined ? { seed: numeric(values.seed, "seed")! } : {}),
    ...(values.space ? { space: values.space as "oklab" | "lab" } : {}),
    ...(values["max-dimension"] !== undefined
      ? { maxDimension: numeric(values["max-dimension"], "max-dimension")! }
      : {}),
  };

  let palette: Palette;
  let label: string;

  try {
    if (input === "-") {
      palette = await extractPaletteFromBuffer(await readStdin(), options);
      label = "stdin";
    } else if (/^https?:\/\//i.test(input)) {
      palette = await extractPaletteFromUrl(input, options);
      label = input;
    } else {
      palette = await extractPaletteFromFile(input, options);
      label = basename(input);
    }
  } catch (error) {
    const message = (error as NodeJS.ErrnoException).code === "ENOENT"
      ? `no such file: ${input}`
      : (error as Error).message;
    process.stderr.write(`${red("error")} ${message}\n`);
    return 1;
  }

  if (palette.swatches.length === 0) {
    process.stderr.write(
      `${red("error")} no colours found. The image may be fully transparent\n`,
    );
    return 1;
  }

  if (format) {
    const output = emit(palette, format, {
      ...(values.prefix ? { prefix: values.prefix } : {}),
      ...(values.scales !== undefined ? { scales: values.scales } : {}),
      ...(values.oklch !== undefined ? { oklch: values.oklch } : {}),
    });

    if (values.out) {
      await writeFile(values.out, output.endsWith("\n") ? output : `${output}\n`, "utf8");
      process.stderr.write(
        `${green("✓")} wrote ${bold(values.out)} ${dim(`(${format}, ${palette.swatches.length} colours)`)}\n`,
      );
    } else {
      process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
    }
  } else {
    printPalette(palette, label);
    if (values.contrast) printContrastMatrix(palette);
  }

  if (!format && values.out) {
    process.stderr.write(
      `${yellow("note")} --out was ignored because no --format was given\n`,
    );
  }

  return 0;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${red("error")} ${(error as Error).message}\n`);
    process.exitCode = 1;
  });
