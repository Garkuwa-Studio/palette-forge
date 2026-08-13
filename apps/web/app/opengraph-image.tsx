import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Palette Forge, extract a brand palette, generate the tokens";

const DEMO = ["#4cc9f0", "#f0554c", "#f0a44c", "#4cf0a8", "#0f121a"];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#08090c",
          padding: 72,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
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
          <div
            style={{
              display: "flex",
              fontSize: 62,
              fontWeight: 700,
              color: "#e8eaf0",
              marginTop: 24,
              lineHeight: 1.1,
              letterSpacing: -1.5,
            }}
          >
            Extract a brand palette.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 62,
              fontWeight: 700,
              color: "#7c8598",
              lineHeight: 1.1,
              letterSpacing: -1.5,
            }}
          >
            Generate the tokens.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, height: 120 }}>
          {DEMO.map((hex) => (
            <div key={hex} style={{ display: "flex", flex: 1, background: hex, borderRadius: 14 }} />
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#4b5364" }}>
          npx palette-forge logo.png &nbsp;·&nbsp; paletteforge.dev
        </div>
      </div>
    ),
    size,
  );
}
