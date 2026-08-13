"use client";

import { useMemo, useState } from "react";
import { emit, extensions, type Palette, type TokenFormat } from "palette-forge";
import { highlight, languageForFormat } from "@/lib/highlight";
import { Button } from "./ui";
import { useToast } from "./Toast";

const TABS: Array<{ id: TokenFormat; label: string }> = [
  { id: "css", label: "tokens.css" },
  { id: "tailwind", label: "Tailwind v4" },
  { id: "shadcn", label: "shadcn/ui" },
  { id: "ts", label: "TypeScript" },
  { id: "scss", label: "SCSS" },
  { id: "dtcg", label: "DTCG" },
  { id: "json", label: "JSON" },
  { id: "svg", label: "SVG" },
];

export function TokenOutput({ palette }: { palette: Palette }) {
  const [format, setFormat] = useState<TokenFormat>("css");
  const [scales, setScales] = useState(false);
  const toast = useToast();

  const code = useMemo(() => {
    try {
      // `scales` is only forwarded when switched on, so each format keeps its
      // own default (Tailwind ships ramps, plain CSS does not).
      return emit(palette, format, scales ? { scales: true } : {});
    } catch (error) {
      return `/* Could not generate tokens: ${(error as Error).message} */`;
    }
  }, [palette, format, scales]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast("Tokens copied");
    } catch {
      toast("Clipboard blocked by the browser", "bad");
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tokens.${extensions[format]}`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("Downloaded");
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Token format"
        className="mb-3 flex flex-wrap items-center gap-1.5"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={format === tab.id}
            onClick={() => setFormat(tab.id)}
            className={`eyebrow cursor-pointer rounded-[5px] border px-3 py-1.5 text-[10px] transition-colors ${
              format === tab.id
                ? "border-accent text-accent"
                : "border-line text-muted hover:border-line-bright hover:text-txt"
            }`}
          >
            {tab.label}
          </button>
        ))}

        <label className="eyebrow ml-auto flex cursor-pointer items-center gap-2 text-muted">
          <input
            type="checkbox"
            checked={scales}
            onChange={(event) => setScales(event.target.checked)}
            className="accent-accent"
          />
          50 to 950 ramps
        </label>
      </div>

      <pre className="scroll-x rounded-lg border border-line bg-surface p-4 font-mono text-[11.5px] leading-[1.75] text-code">
        <code
          dangerouslySetInnerHTML={{ __html: highlight(code, languageForFormat(format)) }}
        />
      </pre>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button onClick={copy}>Copy</Button>
        <Button onClick={download}>Download .{extensions[format]}</Button>
      </div>
    </>
  );
}
