/**
 * Browser helpers: get from "a thing the user dropped" to RGBA pixels.
 *
 * Kept separate from `extract.ts` so the core stays runnable in Node, in a
 * Worker, and in tests without a DOM.
 */

import { extractPalette } from "./extract.js";
import type { ExtractOptions, Palette, PixelSource } from "./types.js";

/** Anything this module knows how to turn into pixels. */
export type ImageInput =
  | HTMLImageElement
  | HTMLCanvasElement
  | ImageBitmap
  | Blob
  | File
  | string;

/**
 * Cap on the raster we ask the GPU/canvas for.
 *
 * A 6000×4000 photo is 96MB of RGBA, enough to jank or fail outright on a
 * phone. Drawing into a 512px box first keeps memory bounded; the sampler then
 * strides down from there to the clustering resolution.
 */
const DRAW_MAX = 512;

interface Canvas2D {
  canvas: { width: number; height: number };
  drawImage: (image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number) => void;
  getImageData: (sx: number, sy: number, sw: number, sh: number) => ImageData;
  imageSmoothingEnabled: boolean;
}

function makeCanvas(width: number, height: number): Canvas2D {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not acquire a 2D context from OffscreenCanvas");
    return ctx as unknown as Canvas2D;
  }

  if (typeof document === "undefined") {
    throw new Error(
      "No canvas available. In Node, use `palette-forge/node` instead of the browser helpers.",
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not acquire a 2D context from canvas");
  return ctx as unknown as Canvas2D;
}

/** Natural pixel dimensions of a drawable source. */
function dimensionsOf(source: CanvasImageSource): { width: number; height: number } {
  const anySource = source as unknown as {
    naturalWidth?: number;
    naturalHeight?: number;
    width?: number;
    height?: number;
  };
  const width = anySource.naturalWidth || anySource.width || 0;
  const height = anySource.naturalHeight || anySource.height || 0;

  if (!width || !height) {
    throw new Error(
      "Image has no intrinsic size. SVGs need explicit width/height or a viewBox before they can be rasterised.",
    );
  }
  return { width, height };
}

/** Decode a Blob/File/URL into something drawable. */
async function toDrawable(input: ImageInput): Promise<CanvasImageSource> {
  if (typeof input === "string") {
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Could not fetch image: ${response.status} ${response.statusText}`);
    }
    return toDrawable(await response.blob());
  }

  if (typeof Blob !== "undefined" && input instanceof Blob) {
    // createImageBitmap is faster and avoids a data-URL round trip, but Safari
    // historically refused SVG blobs, fall back to an <img> in that case.
    if (typeof createImageBitmap === "function" && input.type !== "image/svg+xml") {
      try {
        return await createImageBitmap(input);
      } catch {
        /* fall through */
      }
    }
    return await blobToImageElement(input);
  }

  return input as CanvasImageSource;
}

function blobToImageElement(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      reject(new Error("No Image constructor available in this environment"));
      return;
    }
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image. The file may be corrupt or unsupported"));
    };
    image.src = url;
  });
}

/**
 * Rasterise any image input to RGBA pixels.
 *
 * Smoothing is disabled during the downscale on purpose: bilinear resampling
 * blends adjacent colours into intermediates that were never in the image, and
 * those intermediates are exactly what a palette extractor must not invent.
 */
export async function toPixelSource(
  input: ImageInput,
  maxDimension = DRAW_MAX,
): Promise<PixelSource> {
  const drawable = await toDrawable(input);
  const { width, height } = dimensionsOf(drawable);

  const ratio = Math.min(1, maxDimension / Math.max(width, height));
  const w = Math.max(1, Math.round(width * ratio));
  const h = Math.max(1, Math.round(height * ratio));

  const ctx = makeCanvas(w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(drawable, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);

  if (typeof ImageBitmap !== "undefined" && drawable instanceof ImageBitmap) {
    drawable.close();
  }

  return { data: imageData.data, width: imageData.width, height: imageData.height };
}

/**
 * Extract a palette straight from a `File`, `Blob`, `<img>`, `ImageBitmap`,
 * canvas or URL.
 *
 * @example
 * const palette = await extractPaletteFromImage(event.dataTransfer.files[0], {
 *   colors: 6,
 *   downweightNeutrals: true,
 * });
 */
export async function extractPaletteFromImage(
  input: ImageInput,
  options: ExtractOptions = {},
): Promise<Palette> {
  const source = await toPixelSource(input);
  return extractPalette(source, options);
}

/** True when this environment can rasterise images (browser or Worker). */
export function canRasterise(): boolean {
  return typeof OffscreenCanvas !== "undefined" || typeof document !== "undefined";
}
