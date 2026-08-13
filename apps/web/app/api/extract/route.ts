/**
 * POST /api/extract, server-side extraction.
 *
 * The browser app never calls this; it extracts locally so images stay on the
 * user's machine. This exists for the other consumers: CI jobs, bots, Figma
 * plugins and anything that has an image but no canvas.
 */

import { NextResponse } from "next/server";
import { emit, extensions, type TokenFormat } from "palette-forge";
import { extractPaletteFromBuffer, extractPaletteFromUrl } from "palette-forge/node";

/** Images are decoded in-process, so `sharp` and the Node APIs must be present. */
export const runtime = "nodejs";

/** Refuse anything large enough to be a denial-of-service rather than a logo. */
const MAX_BYTES = 10 * 1024 * 1024;

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  let buffer: Uint8Array | null = null;
  let url: string | null = null;
  let colors = 6;
  let format: TokenFormat | null = null;
  let downweightNeutrals = false;

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        url?: string;
        colors?: number;
        format?: string;
        downweightNeutrals?: boolean;
      };
      url = body.url ?? null;
      colors = Number(body.colors ?? 6);
      format = (body.format as TokenFormat) ?? null;
      downweightNeutrals = Boolean(body.downweightNeutrals);
    } else if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("image");
      if (!(file instanceof File)) return badRequest("Expected an `image` file field");
      if (file.size > MAX_BYTES) {
        return badRequest(`Image exceeds the ${MAX_BYTES / 1024 / 1024}MB limit`, 413);
      }
      buffer = new Uint8Array(await file.arrayBuffer());
      colors = Number(form.get("colors") ?? 6);
      format = (form.get("format") as TokenFormat | null) || null;
      downweightNeutrals = form.get("downweightNeutrals") === "true";
    } else {
      return badRequest(
        "Send multipart/form-data with an `image` field, or JSON with a `url`",
        415,
      );
    }
  } catch {
    return badRequest("Could not parse the request body");
  }

  if (!buffer && !url) return badRequest("Provide either an `image` file or a `url`");
  if (!Number.isFinite(colors) || colors < 1 || colors > 24) {
    return badRequest("`colors` must be between 1 and 24");
  }
  if (format && !(format in extensions)) {
    return badRequest(
      `Unknown format "${format}". Expected one of: ${Object.keys(extensions).join(", ")}`,
    );
  }

  try {
    const palette = buffer
      ? await extractPaletteFromBuffer(buffer, { colors, downweightNeutrals })
      : await extractPaletteFromUrl(url!, { colors, downweightNeutrals });

    if (format) {
      return new NextResponse(emit(palette, format), {
        headers: {
          "content-type": format === "svg" ? "image/svg+xml" : "text/plain; charset=utf-8",
          "cache-control": "public, max-age=3600",
        },
      });
    }

    return NextResponse.json({
      swatches: palette.swatches.map((swatch) => ({
        hex: swatch.hex,
        role: swatch.role,
        name: swatch.name,
        rgb: swatch.rgb,
        hsl: swatch.hsl,
        coverage: +(swatch.share * 100).toFixed(2),
        on: swatch.on,
      })),
      meta: palette.meta,
    });
  } catch (error) {
    return badRequest((error as Error).message, 422);
  }
}
