/**
 * Node entry point: decode image files into pixels.
 *
 * PNG and JPEG are handled by small pure-JS decoders that work everywhere with
 * no native build step, which matters a great deal for `npx`, CI containers and
 * serverless bundles. Anything else (WebP, AVIF, TIFF, HEIC) is delegated to
 * `sharp` if the host project happens to have it installed, and produces an
 * actionable error if not.
 */

import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { extractPalette } from "../extract.js";
import type { ExtractOptions, Palette, PixelSource } from "../types.js";

/** Formats decodable with no extra dependencies. */
export const NATIVE_FORMATS = ["png", "jpg", "jpeg"] as const;

/** Formats that need `sharp` to be installed alongside. */
export const SHARP_FORMATS = ["webp", "avif", "tiff", "tif", "gif", "heic", "heif"] as const;

/** Sniff the container from magic bytes; extensions lie often enough to matter. */
function sniff(buffer: Uint8Array): string | null {
  const b = buffer;
  if (b.length < 12) return null;

  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "gif";
  if (b[0] === 0x42 && b[1] === 0x4d) return "bmp";

  const ascii = (start: number, length: number) =>
    String.fromCharCode(...b.subarray(start, start + length));

  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "webp";
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "avif";
    if (brand.startsWith("heic") || brand.startsWith("heix") || brand.startsWith("mif1")) {
      return "heic";
    }
  }
  if ((b[0] === 0x49 && b[1] === 0x49) || (b[0] === 0x4d && b[1] === 0x4d)) return "tiff";

  return null;
}

async function decodeWithSharp(buffer: Uint8Array, format: string): Promise<PixelSource> {
  let sharp: (typeof import("sharp"))["default"];
  try {
    ({ default: sharp } = await import("sharp"));
  } catch {
    throw new Error(
      `Decoding ${format.toUpperCase()} requires the optional peer dependency "sharp".\n` +
        `  Install it:  npm install sharp\n` +
        `  Or convert the image to PNG or JPEG first.`,
    );
  }

  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}

/**
 * Decode encoded image bytes into RGBA pixels.
 *
 * @param buffer Raw file contents.
 * @param hint Optional filename or extension, used only when magic-byte
 *   sniffing is inconclusive.
 */
export async function decodeImage(
  buffer: Uint8Array,
  hint?: string,
): Promise<PixelSource> {
  const format =
    sniff(buffer) ??
    (hint ? extname(hint).slice(1).toLowerCase().replace("jpg", "jpeg") : null);

  if (!format) {
    throw new Error(
      "Could not identify the image format. Supported: PNG, JPEG natively; " +
        "WebP, AVIF, TIFF, GIF and HEIC via the optional `sharp` peer dependency.",
    );
  }

  if (format === "png") {
    const { PNG } = await import("pngjs");
    const png = PNG.sync.read(Buffer.from(buffer));
    return {
      data: new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.byteLength),
      width: png.width,
      height: png.height,
    };
  }

  if (format === "jpeg") {
    const jpeg = await import("jpeg-js");
    // `useTArray` returns a Uint8Array view rather than a Node Buffer copy.
    const decoded = jpeg.default.decode(buffer, { useTArray: true, formatAsRGBA: true });
    return {
      data: new Uint8ClampedArray(
        decoded.data.buffer,
        decoded.data.byteOffset,
        decoded.data.byteLength,
      ),
      width: decoded.width,
      height: decoded.height,
    };
  }

  return decodeWithSharp(buffer, format);
}

/**
 * Extract a palette from an image file on disk.
 *
 * @example
 * ```ts
 * import { extractPaletteFromFile } from "palette-forge/node";
 * import { toShadcn } from "palette-forge";
 *
 * const palette = await extractPaletteFromFile("./brand/logo.png", { colors: 6 });
 * await writeFile("app/globals.css", toShadcn(palette));
 * ```
 */
export async function extractPaletteFromFile(
  path: string,
  options: ExtractOptions = {},
): Promise<Palette> {
  const buffer = await readFile(path);
  const pixels = await decodeImage(buffer, path);
  return extractPalette(pixels, options);
}

/** Extract a palette from encoded image bytes already in memory. */
export async function extractPaletteFromBuffer(
  buffer: Uint8Array,
  options: ExtractOptions = {},
  hint?: string,
): Promise<Palette> {
  const pixels = await decodeImage(buffer, hint);
  return extractPalette(pixels, options);
}

/** Fetch a remote image and extract its palette. */
export async function extractPaletteFromUrl(
  url: string,
  options: ExtractOptions = {},
): Promise<Palette> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  return extractPaletteFromBuffer(buffer, options, url);
}
