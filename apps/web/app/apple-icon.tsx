import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const alt = "Palette Forge";

/**
 * Apple touch icon.
 *
 * Same four-bar mark as `icon.svg`, but iOS requires a raster and applies its
 * own rounding, so this fills the full square rather than carrying its own
 * corner radius. Generated rather than exported from the logo so it stays sharp
 * and never drifts from the brand hexes.
 */
export default function AppleIcon() {
  const bars = ["#4cc9f0", "#f0554c", "#f0a44c", "#4cf0a8"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "#08090c",
        }}
      >
        {bars.map((color) => (
          <div
            key={color}
            style={{
              width: 26,
              height: 100,
              borderRadius: 11,
              background: color,
            }}
          />
        ))}
      </div>
    ),
    size,
  );
}
