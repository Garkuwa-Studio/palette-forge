"use client";

import { useMemo } from "react";
import { contrastMatrix, type Palette } from "palette-forge";
import { Dot, Pill } from "./ui";

export function ContrastMatrix({ palette }: { palette: Palette }) {
  const rows = useMemo(
    () => contrastMatrix(palette.swatches.map((s) => s.hex), { limit: 24 }),
    [palette],
  );

  if (rows.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted">
        No pairing in this palette reaches even 1.6:1, every colour is too close in
        luminance to sit on top of another.
      </p>
    );
  }

  return (
    <>
      <div className="scroll-x -mx-1 px-1">
        <table className="w-full min-w-[540px] border-collapse font-mono text-[11px]">
          <thead>
            <tr className="eyebrow text-[10px] text-muted">
              {["Foreground", "Background", "Ratio", "Normal AA", "Large AA", "AAA"].map(
                (heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="border-b border-line px-2.5 py-2 text-left font-normal"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.foreground}-${row.background}`}>
                <td className="border-b border-surface-2 px-2.5 py-2">
                  <Dot hex={row.foreground} />
                  {row.foreground.toUpperCase()}
                </td>
                <td className="border-b border-surface-2 px-2.5 py-2">
                  <Dot hex={row.background} />
                  {row.background.toUpperCase()}
                </td>
                <td className="border-b border-surface-2 px-2.5 py-2 tabular-nums">
                  {row.ratio}:1
                </td>
                <td className="border-b border-surface-2 px-2.5 py-2">
                  <Pill ok={row.aaNormal}>{row.aaNormal ? "PASS" : "FAIL"}</Pill>
                </td>
                <td className="border-b border-surface-2 px-2.5 py-2">
                  <Pill ok={row.aaLarge}>{row.aaLarge ? "PASS" : "FAIL"}</Pill>
                </td>
                <td className="border-b border-surface-2 px-2.5 py-2">
                  <Pill ok={row.aaaNormal}>{row.aaaNormal ? "PASS" : "FAIL"}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 max-w-[70ch] text-xs leading-relaxed text-muted">
        Normal text needs 4.5:1, large text (18.66px bold / 24px regular) needs 3:1, AAA needs
        7:1. Each pair is listed once, darker colour as the foreground. A pairing that fails
        here fails on the live site.
      </p>
    </>
  );
}
