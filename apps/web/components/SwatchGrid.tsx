"use client";

import type { Palette, Role } from "palette-forge";
import { useToast } from "./Toast";

const ROLES: Role[] = ["primary", "accent", "ink", "paper", "neutral", "support"];

export function SwatchGrid({
  palette,
  onRoleChange,
}: {
  palette: Palette;
  onRoleChange: (hex: string, role: Role) => void;
}) {
  const toast = useToast();

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      toast(`Copied ${hex.toUpperCase()}`);
    } catch {
      toast("Clipboard blocked by the browser", "bad");
    }
  };

  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr))]">
      {palette.swatches.map((swatch) => (
        <article
          key={swatch.hex}
          className="overflow-hidden rounded-lg border border-line bg-surface transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-accent"
        >
          <button
            type="button"
            onClick={() => copy(swatch.hex)}
            aria-label={`Copy ${swatch.hex}`}
            className="relative block h-20 w-full cursor-pointer"
            style={{ background: swatch.hex }}
          >
            <span
              className="eyebrow absolute left-2 top-2 rounded-[3px] px-1.5 py-0.5 text-[9px]"
              style={{
                color: swatch.on,
                background:
                  swatch.on === "#000000" ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.5)",
              }}
            >
              {swatch.role}
            </span>
          </button>

          <div className="p-2.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => copy(swatch.hex)}
              className="cursor-pointer text-sm font-semibold tracking-[.02em] hover:text-accent"
            >
              {swatch.hex.toUpperCase()}
            </button>

            <div className="mt-1 leading-[1.7] text-muted">
              rgb {swatch.rgb.join(" ")}
              <br />
              hsl {swatch.hsl[0]} {swatch.hsl[1]}% {swatch.hsl[2]}%
              <br />
              {(swatch.share * 100).toFixed(1)}% coverage
            </div>

            <div className="mt-2 h-[3px] overflow-hidden rounded-sm bg-line">
              <i
                className="block h-full bg-accent"
                // Coverage rarely exceeds ~45%, so the bar is scaled to fill
                // usefully rather than sitting permanently near-empty.
                style={{ width: `${Math.min(100, swatch.share * 100 * 2.2)}%` }}
              />
            </div>

            <label className="mt-2.5 flex items-center gap-1.5 text-[10px] text-faint">
              <span className="sr-only">Role for {swatch.hex}</span>
              <select
                value={swatch.role}
                onChange={(event) => onRoleChange(swatch.hex, event.target.value as Role)}
                className="w-full cursor-pointer rounded-[3px] border border-line bg-surface-2 px-1.5 py-1 font-mono text-[10px] text-muted hover:border-line-bright focus:text-txt"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>
      ))}
    </div>
  );
}
