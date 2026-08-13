/**
 * Verify the app's own themes pass WCAG AA, using the app's own library.
 *
 * A tool that reports contrast failures has no business shipping them. This
 * parses the real token values out of `app/globals.css` rather than taking a
 * hardcoded copy, so it fails when someone edits the stylesheet and forgets.
 *
 *   node scripts/check-contrast.mjs
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { contrast, WCAG } from "palette-forge";

const here = dirname(fileURLToPath(import.meta.url));
const css = await readFile(join(here, "..", "app", "globals.css"), "utf8");

/** Pull `--pf-*: #hex;` pairs out of the block a selector introduces. */
function tokensFor(selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`Selector not found in globals.css: ${selector}`);
  const open = css.indexOf("{", start);
  const end = css.indexOf("\n  }", open) === -1 ? css.indexOf("}", open) : css.indexOf("}", open);
  const block = css.slice(open, end);

  const tokens = {};
  for (const [, name, value] of block.matchAll(/--pf-([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    tokens[name] = value;
  }
  return tokens;
}

const themes = {
  light: tokensFor(":root {"),
  dark: tokensFor(':root[data-theme="dark"]'),
};

// Text tokens that must be readable, against every surface they can sit on.
const TEXT = ["txt", "muted", "faint", "accent", "warn", "bad", "ok"];
const SURFACES = ["bg", "surface", "surface-2"];

// Syntax colours only ever appear inside a code block, so they are checked
// against that one background rather than all three.
const SYNTAX = [
  "syn-comment", "syn-string", "syn-keyword", "syn-number",
  "syn-fn", "syn-builtin", "syn-prop", "syn-punct",
];

let failures = 0;
let checks = 0;

for (const [name, tokens] of Object.entries(themes)) {
  console.log(`\n  ${name}`);
  console.log("  " + "─".repeat(52));

  for (const text of TEXT) {
    const fg = tokens[text];
    if (!fg) {
      console.log(`  ⚠ missing token --pf-${text}`);
      failures++;
      continue;
    }

    const results = SURFACES.map((surface) => {
      const ratio = contrast(fg, tokens[surface]);
      checks++;
      if (ratio < WCAG.AA_NORMAL) failures++;
      return { surface, ratio, ok: ratio >= WCAG.AA_NORMAL };
    });

    const worst = Math.min(...results.map((r) => r.ratio));
    const mark = results.every((r) => r.ok) ? "✓" : "✗";
    const detail = results.map((r) => `${r.surface} ${r.ratio}`).join("  ");
    console.log(`  ${mark} ${text.padEnd(7)} ${fg}  worst ${String(worst).padStart(5)}:1   ${detail}`);
  }

  for (const token of SYNTAX) {
    const fg = tokens[token];
    if (!fg) {
      console.log(`  ⚠ missing token --pf-${token}`);
      failures++;
      continue;
    }
    const ratio = contrast(fg, tokens.surface);
    checks++;
    if (ratio < WCAG.AA_NORMAL) failures++;
    const mark = ratio >= WCAG.AA_NORMAL ? "✓" : "✗";
    console.log(`  ${mark} ${token.padEnd(11)} ${fg}  ${String(ratio).padStart(5)}:1 on code bg`);
  }
}

console.log(`\n  ${checks} pairings checked, ${failures} below AA (${WCAG.AA_NORMAL}:1)\n`);
process.exit(failures > 0 ? 1 : 0);
