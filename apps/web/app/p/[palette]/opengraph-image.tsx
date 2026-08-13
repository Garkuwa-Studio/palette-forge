import { ImageResponse } from "next/og";
import { bestTextColor } from "palette-forge";
import { decodePalette } from "@/lib/share";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Colour palette";

/**
 * The share card.
 *
 * This is the growth loop: a palette link posted anywhere unfurls into a picture
 * of the actual palette, which is far more clickable than a logo and a title.
 * Colours are read straight from the URL, so the card needs no storage.
 */
export default async function Image({ params }: { params: Promise<{ palette: string }> }) {
  const { palette: segment } = await params;
  const hexes = decodePalette(segment) ?? ["#4cc9f0", "#f0554c", "#0f121a", "#f8f9fb"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#08090c",
          padding: 64,
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 4,
            color: "#4cc9f0",
            textTransform: "uppercase",
          }}
        >
          Palette Forge
        </div>

        <div style={{ display: "flex", flex: 1, gap: 16, marginTop: 40, marginBottom: 32 }}>
          {hexes.map((hex) => (
            <div
              key={hex}
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                justifyContent: "flex-end",
                background: hex,
                borderRadius: 18,
                padding: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 700,
                  color: bestTextColor(hex),
                }}
              >
                {hex.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#7c8598" }}>
          {hexes.length} colours · WCAG scored · CSS, Tailwind, shadcn &amp; DTCG tokens
        </div>
      </div>
    ),
    size,
  );
}
