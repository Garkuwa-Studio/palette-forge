import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contrastMatrix } from "palette-forge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { decodePalette, encodePalette } from "@/lib/share";
import { paletteFromHexes } from "@/lib/palette-from-hexes";
import { SharedTokens } from "./SharedTokens";

interface Props {
  params: Promise<{ palette: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { palette: segment } = await params;
  const hexes = decodePalette(segment);
  if (!hexes) return { title: "Palette not found" };

  const title = `${hexes.length}-colour palette · ${hexes[0]!.toUpperCase()}`;
  const description = `${hexes.map((h) => h.toUpperCase()).join(" · ")}, with WCAG contrast scores and ready-to-paste design tokens.`;

  return {
    title,
    description,
    alternates: { canonical: `/p/${encodePalette(hexes)}` },
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedPalette({ params }: Props) {
  const { palette: segment } = await params;
  const hexes = decodePalette(segment);
  if (!hexes) notFound();

  const palette = paletteFromHexes(hexes);
  const pairs = contrastMatrix(hexes, { limit: 8 });

  return (
    <main className="mx-auto max-w-[1080px]">
      <header className="mb-8 border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="eyebrow text-accent hover:underline">
            Palette Forge
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="font-mono text-[11px] text-muted hover:text-accent">
              Forge your own →
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <h1 className="mt-2.5 text-[clamp(24px,4vw,34px)] font-semibold leading-[1.1] tracking-[-0.025em]">
          A shared palette
        </h1>
        <p className="mt-2 max-w-[62ch] text-sm text-muted">
          {hexes.length} colours, scored for contrast and ready to export. Coverage isn&rsquo;t
          shown here. A link carries the colours, not the image they came from.
        </p>
      </header>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,170px),1fr))]">
        {palette.swatches.map((swatch) => (
          <article
            key={swatch.hex}
            className="overflow-hidden rounded-lg border border-line bg-surface"
          >
            <div className="relative h-24" style={{ background: swatch.hex }}>
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
            </div>
            <div className="p-2.5 font-mono text-[11px]">
              <div className="text-sm font-semibold">{swatch.hex.toUpperCase()}</div>
              <div className="mt-1 leading-[1.7] text-muted">
                rgb {swatch.rgb.join(" ")}
                <br />
                hsl {swatch.hsl[0]} {swatch.hsl[1]}% {swatch.hsl[2]}%
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="eyebrow mb-4 border-b border-line pb-2.5 text-muted">
          Strongest pairings
        </h2>
        <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))]">
          {pairs.map((pair) => (
            <li
              key={`${pair.foreground}-${pair.background}`}
              className="flex items-center justify-between gap-3 rounded-md px-3 py-2.5 font-mono text-[11px]"
              style={{ background: pair.background, color: pair.foreground }}
            >
              <span>{pair.foreground.toUpperCase()}</span>
              <span className="tabular-nums opacity-80">
                {pair.ratio}:1 {pair.level === "fail" ? "" : pair.level}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="eyebrow mb-4 border-b border-line pb-2.5 text-muted">Tokens</h2>
        <SharedTokens palette={palette} />
      </section>

      <footer className="mt-16 border-t border-line pt-6 font-mono text-[11px] text-faint">
        <Link href="/" className="hover:text-accent">
          ← Extract a palette from your own image
        </Link>
      </footer>
    </main>
  );
}
