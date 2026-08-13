/**
 * Palette permalinks.
 *
 * A palette encodes into the URL path as dash-separated hexes:
 * `/p/4cc9f0-f0554c-0f121a-f8f9fb`. No database, no IDs, no expiry. The link
 * *is* the palette, which means sharing costs nothing and links never rot.
 */

import { isHex, fromHex, toHex } from "palette-forge";

/** Upper bound on colours in a link, to keep URLs and OG images sane. */
const MAX_COLORS = 12;

/** `["#4cc9f0", "#f0554c"]` → `"4cc9f0-f0554c"`. */
export function encodePalette(hexes: string[]): string {
  return hexes
    .slice(0, MAX_COLORS)
    .map((hex) => hex.replace(/^#/, "").toLowerCase())
    .join("-");
}

/**
 * Parse a permalink segment back into hexes.
 *
 * Returns `null` for anything malformed so the route can render a 404 rather
 * than a page of undefined colours.
 */
export function decodePalette(segment: string): string[] | null {
  if (!segment) return null;

  const parts = decodeURIComponent(segment).split("-").filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_COLORS) return null;

  const hexes: string[] = [];
  for (const part of parts) {
    if (!isHex(part)) return null;
    // Normalise shorthand and strip any alpha, so `/p/f00` and `/p/ff0000`
    // resolve to the same palette.
    hexes.push(toHex(fromHex(part)));
  }
  return hexes;
}

/** Absolute URL for a palette, for share buttons and OG metadata. */
export function paletteUrl(hexes: string[], origin: string): string {
  return `${origin.replace(/\/$/, "")}/p/${encodePalette(hexes)}`;
}
