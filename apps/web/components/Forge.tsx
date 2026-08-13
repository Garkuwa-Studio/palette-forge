"use client";

import { useCallback, useMemo, useState } from "react";
import { usePalette } from "palette-forge/react";
import { nameSwatches, type Palette, type Role, type Swatch } from "palette-forge";
import { encodePalette } from "@/lib/share";
import { Controls, type ForgeSettings } from "./Controls";
import { ContrastMatrix } from "./ContrastMatrix";
import { Dropzone } from "./Dropzone";
import { SwatchGrid } from "./SwatchGrid";
import { TokenOutput } from "./TokenOutput";
import { Button, Section } from "./ui";
import { useToast } from "./Toast";

const INITIAL: ForgeSettings = {
  colors: 6,
  downweightNeutrals: false,
  space: "oklab",
  seed: 0x5eed,
};

/**
 * Re-apply manual role overrides on top of a freshly extracted palette.
 *
 * Extraction re-runs whenever a setting changes, which would otherwise discard
 * every correction the user has made. Overrides are keyed by hex, so they
 * survive as long as the colour itself does.
 */
function applyOverrides(palette: Palette, overrides: Record<string, Role>): Palette {
  if (Object.keys(overrides).length === 0) return palette;

  const roles = palette.swatches.map((s) => overrides[s.hex] ?? s.role);
  const names = nameSwatches(roles);

  const swatches: Swatch[] = palette.swatches.map((swatch, i) => ({
    ...swatch,
    role: roles[i]!,
    name: names[i]!,
  }));

  const byRole: Partial<Record<Role, Swatch[]>> = {};
  for (const swatch of swatches) (byRole[swatch.role] ??= []).push(swatch);

  return { ...palette, swatches, byRole };
}

export function Forge() {
  const [settings, setSettings] = useState<ForgeSettings>(INITIAL);
  const [overrides, setOverrides] = useState<Record<string, Role>>({});
  const toast = useToast();

  const { palette: raw, status, error, preview, load, reset } = usePalette({
    colors: settings.colors,
    downweightNeutrals: settings.downweightNeutrals,
    space: settings.space,
    seed: settings.seed,
  });

  const palette = useMemo(
    () => (raw ? applyOverrides(raw, overrides) : null),
    [raw, overrides],
  );

  const onFile = useCallback(
    (file: File) => {
      // A new image invalidates every correction made against the old one.
      setOverrides({});
      void load(file);
    },
    [load],
  );

  const onRoleChange = useCallback((hex: string, role: Role) => {
    setOverrides((previous) => ({ ...previous, [hex]: role }));
  }, []);

  const share = async () => {
    if (!palette) return;
    const url = `${window.location.origin}/p/${encodePalette(palette.swatches.map((s) => s.hex))}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Share link copied");
    } catch {
      toast("Clipboard blocked by the browser", "bad");
    }
  };

  const startOver = () => {
    setOverrides({});
    setSettings(INITIAL);
    reset();
  };

  return (
    <>
      <Dropzone onFile={onFile} busy={status === "loading"} />

      <Controls
        settings={settings}
        disabled={status === "loading" || !raw}
        onChange={(next) => setSettings((previous) => ({ ...previous, ...next }))}
        // A new seed re-seeds k-means++, which lands the clusters differently,
        // useful when a palette splits one colour and misses another entirely.
        onReshuffle={() =>
          setSettings((previous) => ({
            ...previous,
            seed: Math.floor(Math.random() * 0xffffff),
          }))
        }
      />

      {status === "error" && error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-bad/40 bg-bad/8 px-4 py-3 font-mono text-xs text-bad"
        >
          {error.message}
        </p>
      )}

      {preview && (
        <Section title="Source">
          {/* Deliberately a plain <img>: the source is a client-side object URL
              that next/image cannot optimise, and it never leaves the browser. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="The image the palette was extracted from"
            className="block max-h-64 max-w-full rounded-lg border border-line"
          />
        </Section>
      )}

      {palette && (
        <>
          <Section title="Palette" hint=" click any swatch to copy, change a role to rename its token">
            <SwatchGrid palette={palette} onRoleChange={onRoleChange} />
            <p className="mt-4 max-w-[70ch] text-xs leading-relaxed text-muted">
              Roles are inferred: darkest → <code className="text-txt">ink</code>, lightest →{" "}
              <code className="text-txt">paper</code>, highest chroma × coverage →{" "}
              <code className="text-txt">primary</code>. Override anything that looks wrong,
              the generator names tokens after these.
            </p>
            <p className="mt-2 font-mono text-[11px] text-faint">
              {palette.meta.pixelsSampled.toLocaleString()} px sampled ·{" "}
              {palette.meta.iterations} iterations · {palette.meta.durationMs}ms ·{" "}
              {palette.meta.space}
            </p>
          </Section>

          <Section title="Contrast matrix" hint=" WCAG 2.1">
            <ContrastMatrix palette={palette} />
          </Section>

          <Section title="Generated tokens">
            <TokenOutput palette={palette} />
          </Section>

          <div className="mt-10 flex flex-wrap gap-2.5 border-t border-line pt-6">
            <Button onClick={share}>Copy share link</Button>
            <Button onClick={startOver}>Start over</Button>
          </div>
        </>
      )}
    </>
  );
}
