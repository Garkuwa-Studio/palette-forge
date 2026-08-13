import type { Metadata } from "next";
import Link from "next/link";
import { DocsNav, type DocsNavItem } from "@/components/DocsNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { highlight, type Language } from "@/lib/highlight";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "Install palette-forge, extract palettes in the browser, in Node, or from the CLI, and emit CSS, Tailwind, shadcn/ui or DTCG design tokens.",
};

function Code({ children, lang = "ts" }: { children: string; lang?: Language }) {
  return (
    <pre className="scroll-x mt-3 rounded-lg border border-line bg-surface p-4 font-mono text-[11.5px] leading-[1.75] text-code">
      {/* Highlighted at build time, so this ships no client JavaScript. The
          highlighter escapes every character it emits. */}
      <code dangerouslySetInnerHTML={{ __html: highlight(children, lang) }} />
    </pre>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="eyebrow mb-4 mt-14 scroll-mt-24 border-b border-line pb-2.5 text-muted lg:scroll-mt-10"
    >
      {children}
    </h2>
  );
}

const NAV: DocsNavItem[] = [
  { id: "start", label: "Start here" },
  { id: "install", label: "Install" },
  { id: "browser", label: "In the browser" },
  { id: "react", label: "React hooks" },
  { id: "node", label: "In Node" },
  { id: "cli", label: "CLI" },
  { id: "formats", label: "Token formats" },
  { id: "contrast", label: "Contrast & repair" },
  { id: "scales", label: "Tonal scales" },
  { id: "api", label: "HTTP API" },
  { id: "words", label: "Words explained" },
];

export default function Docs() {
  return (
    <main className="mx-auto max-w-[1180px]">
      <header className="mb-8 border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="eyebrow text-accent hover:underline">
            Palette Forge
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="https://www.npmjs.com/package/palette-forge"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-muted hover:text-accent"
            >
              npm ↗
            </a>
            <ThemeToggle />
          </div>
        </div>
        <h1 className="mt-2.5 text-[clamp(24px,4vw,34px)] font-semibold tracking-[-0.025em]">
          Documentation
        </h1>
        <p className="mt-2.5 max-w-[62ch] text-sm text-muted">
          <code className="font-mono text-txt">palette-forge</code> is the engine behind this
          site, published as a zero-dependency npm package. It runs in the browser, in Node, in a
          Worker, and from the command line.
        </p>
      </header>

      <div className="lg:grid lg:grid-cols-[196px_minmax(0,1fr)] lg:items-start lg:gap-14">
        <DocsNav items={NAV} />

        <article className="max-w-[76ch] text-sm leading-relaxed text-muted">
        <H2 id="start">Start here. The plain version</H2>
        <p>
          You have a picture. It has colours in it. You want those colours as code you can use
          in your own site or app. That is the entire tool.
        </p>
        <p className="mt-3">
          The fastest way: go to{" "}
          <Link href="/" className="text-txt underline underline-offset-2 hover:text-accent">
            the homepage
          </Link>{" "}
          and drag a picture onto it. The colours appear. Click one to copy it. You&rsquo;re
          done. You can stop reading here.
        </p>

        <h3 className="mt-6 mb-2 font-medium text-txt">What the four sections mean</h3>
        <p>
          <b className="text-txt">The colours.</b> Each rectangle is one colour found in your
          picture, with its code (like <code className="font-mono text-txt">#4CC9F0</code>) and
          how much of the picture it covers.
        </p>
        <p className="mt-2">
          <b className="text-txt">The labels.</b> The tool guesses what each colour is{" "}
          <i>for</i>, <code className="font-mono text-txt">primary</code> is your main brand
          colour, <code className="font-mono text-txt">ink</code> is for text,{" "}
          <code className="font-mono text-txt">paper</code> is for backgrounds. It&rsquo;s a
          guess. Use the dropdown under any colour to correct it.
        </p>
        <p className="mt-2">
          <b className="text-txt">The contrast matrix.</b> Some colour pairs are hard to read,
          light grey text on white, for instance. This checks every pair and says{" "}
          <b className="text-ok">PASS</b> or <b className="text-bad">FAIL</b>. You don&rsquo;t
          need to understand the numbers. Look for PASS.
        </p>
        <p className="mt-2">
          <b className="text-txt">The generated tokens.</b> The actual code, ready to copy. The
          tabs are different flavours of the same thing, pick{" "}
          <code className="font-mono text-txt">tokens.css</code> if you&rsquo;re unsure, or{" "}
          <code className="font-mono text-txt">shadcn/ui</code> if you use shadcn (it does the
          most work for you).
        </p>

        <h3 className="mt-6 mb-2 font-medium text-txt">If something looks wrong</h3>
        <p>
          <b className="text-txt">Only got white and grey?</b> Your picture is probably a
          screenshot, and screenshots are mostly background. Tick{" "}
          <b className="text-txt">Ignore background greys</b>.
        </p>
        <p className="mt-2">
          <b className="text-txt">Too many similar colours?</b> Turn the{" "}
          <b className="text-txt">Colours</b> slider down. You&rsquo;re asking for more colours
          than the picture really has.
        </p>
        <p className="mt-2">
          <b className="text-txt">It missed a colour you can see?</b> Turn the slider up, or
          press <b className="text-txt">Try a different split</b>.
        </p>

        <H2 id="install">Install</H2>
        <Code lang="bash">{`npm install palette-forge
# or: pnpm add palette-forge · yarn add palette-forge · bun add palette-forge`}</Code>
        <p className="mt-3">
          No runtime dependencies in the browser path. PNG and JPEG decoding in Node is bundled;{" "}
          <code className="font-mono text-txt">sharp</code> is an optional peer dependency that
          unlocks WebP, AVIF, TIFF, GIF and HEIC.
        </p>

        <H2 id="browser">In the browser</H2>
        <p>
          <code className="font-mono text-txt">extractPaletteFromImage</code> accepts a{" "}
          <code className="font-mono text-txt">File</code>,{" "}
          <code className="font-mono text-txt">Blob</code>, <code className="font-mono text-txt">
            &lt;img&gt;
          </code>
          , <code className="font-mono text-txt">ImageBitmap</code>, canvas or URL.
        </p>
        <Code>{`import { extractPaletteFromImage, toCSS } from "palette-forge";

const palette = await extractPaletteFromImage(file, {
  colors: 6,
  downweightNeutrals: true, // demote greys so brand colours surface
});

palette.swatches[0].hex;        // "#4cc9f0"
palette.swatches[0].role;       // "primary"
palette.swatches[0].share;      // 0.34  (34% coverage)
palette.byRole.primary?.[0];    // the brand colour specifically

console.log(toCSS(palette));`}</Code>
        <p className="mt-3">
          Extraction is deterministic: the same image and options always produce the same
          palette, so results can be cached, diffed and asserted against in tests.
        </p>

        <H2 id="react">React hooks</H2>
        <p>
          <code className="font-mono text-txt">palette-forge/react</code> is headless, hooks and
          state, no markup and no styles.
        </p>
        <Code>{`"use client";
import { usePalette, useDropzone } from "palette-forge/react";

export function Forge() {
  const { palette, load, preview, status } = usePalette({ colors: 6 });
  const { rootProps, inputProps, isOver } = useDropzone({ onFile: load });

  return (
    <div {...rootProps} data-over={isOver}>
      <input {...inputProps} />
      {status === "loading" && <Spinner />}
      {palette?.swatches.map((s) => (
        <span key={s.hex} style={{ background: s.hex, color: s.on }}>
          {s.hex}
        </span>
      ))}
    </div>
  );
}`}</Code>
        <p className="mt-3">
          The decoded pixels are cached separately from the palette, so changing{" "}
          <code className="font-mono text-txt">colors</code> re-clusters in a millisecond or two
          without re-decoding the image, which is what makes a live slider feel instant.
        </p>

        <H2 id="node">In Node</H2>
        <Code>{`import { extractPaletteFromFile } from "palette-forge/node";
import { toShadcn } from "palette-forge";
import { writeFile } from "node:fs/promises";

const palette = await extractPaletteFromFile("./brand/logo.png", { colors: 6 });
await writeFile("app/globals.css", toShadcn(palette));`}</Code>
        <p className="mt-3">
          Also available: <code className="font-mono text-txt">extractPaletteFromBuffer</code>,{" "}
          <code className="font-mono text-txt">extractPaletteFromUrl</code> and{" "}
          <code className="font-mono text-txt">decodeImage</code>.
        </p>

        <H2 id="cli">CLI</H2>
        <Code lang="bash">{`# Look at a palette in the terminal, in true colour
npx palette-forge logo.png

# Generate a shadcn/ui theme
npx palette-forge logo.png --format shadcn --out app/globals.css

# Tailwind v4 theme with full 50 to 950 ramps, straight from a URL
npx palette-forge https://example.com/hero.jpg -f tailwind -o theme.css

# Audit a screenshot's accessibility
npx palette-forge screenshot.png --colors 8 --neutrals --contrast

# Pipe it
cat logo.png | npx palette-forge - -f json`}</Code>

        <H2 id="formats">Token formats</H2>
        <p>
          Nine emitters, all pure string builders:{" "}
          <code className="font-mono text-txt">css</code>,{" "}
          <code className="font-mono text-txt">tailwind</code>,{" "}
          <code className="font-mono text-txt">scss</code>,{" "}
          <code className="font-mono text-txt">ts</code>,{" "}
          <code className="font-mono text-txt">js</code>,{" "}
          <code className="font-mono text-txt">json</code>,{" "}
          <code className="font-mono text-txt">dtcg</code>,{" "}
          <code className="font-mono text-txt">shadcn</code> and{" "}
          <code className="font-mono text-txt">svg</code>.
        </p>
        <Code>{`import { emit, toTailwind, toDTCG } from "palette-forge";

emit(palette, "tailwind", { scales: true });  // @theme block, oklch, 50 to 950
emit(palette, "shadcn");                       // :root + .dark, AA-repaired
emit(palette, "dtcg");                         // W3C Design Tokens JSON
emit(palette, "css", { prefix: "brand" });     // --brand-primary: …`}</Code>
        <p className="mt-3">
          The <code className="font-mono text-txt">shadcn</code> emitter is the shortcut worth
          knowing: it derives a full semantic theme, background, card, popover, muted, border,
          ring, destructive, for light and dark, and contrast-repairs every text/surface pair to
          AA before emitting.
        </p>

        <H2 id="contrast">Contrast &amp; repair</H2>
        <Code>{`import { contrast, evaluateContrast, contrastMatrix, ensureContrast } from "palette-forge";

contrast("#767676", "#ffffff");          // 4.54
evaluateContrast("#767676", "#ffffff");  // { ratio, aaNormal, aaLarge, level: "AA", … }
contrastMatrix(hexes, { limit: 20 });    // every pairing, ranked

// Nudge a colour until it passes, holding its hue
ensureContrast("#4cc9f0", "#ffffff");                 // → "#0081a1" (4.51:1)
ensureContrast("#4cc9f0", "#ffffff", { target: 7 });  // → "#00617a" (7.02:1)`}</Code>

        <H2 id="scales">Tonal scales</H2>
        <p>
          Ramps are generated in OKLCH and gamut-mapped by reducing chroma, so hue holds across
          the whole ramp instead of skewing at the ends.
        </p>
        <Code>{`import { scale, neutralScale, harmony } from "palette-forge";

scale("#4cc9f0");                          // { 50: "#e8f9ff", …, 300: "#4cc9f0", …, 950: "#002935" }
scale("#4cc9f0", { saturation: 0.5 });     // muted, editorial
neutralScale("#4cc9f0");                   // greys carrying a trace of brand hue
harmony.complementary("#4cc9f0");          // OKLCH hue rotation`}</Code>
        <p className="mt-3">
          By default the source colour is anchored: it appears verbatim at its nearest stop, so
          the brand colour is genuinely in the ramp rather than approximated.
        </p>

        <H2 id="api">HTTP API</H2>
        <p>
          This site exposes the Node path at{" "}
          <code className="font-mono text-txt">POST /api/extract</code> for consumers without a
          canvas, CI jobs, bots, plugins.
        </p>
        <Code lang="bash">{`curl -X POST https://paletteforge.dev/api/extract \\
  -F image=@logo.png -F colors=6

curl -X POST https://paletteforge.dev/api/extract \\
  -H 'content-type: application/json' \\
  -d '{"url":"https://example.com/logo.png","format":"shadcn"}'`}</Code>
        <p className="mt-3">
          The browser app never calls it, extraction there is entirely local, and no image ever
          leaves the machine.
        </p>

        <H2 id="words">Words explained</H2>
        <p className="mb-4">
          Every technical term used on this page, in plain English.
        </p>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
          {(
            [
              ["hex code", "A colour written as #4CC9F0. Just a way of naming a colour that computers understand."],
              ["palette", "A set of colours that go together."],
              ["swatch", "One single colour within a palette."],
              ["design token", "A colour saved under a name (like `primary`) so you can reuse it everywhere and change it in one place."],
              ["contrast", "How different two colours are in brightness. High contrast is easy to read; low contrast isn't."],
              ["WCAG", "The international standard for what counts as readable. AA is the level almost everyone targets. It needs a contrast ratio of 4.5 for normal text."],
              ["ramp / scale", "Light-to-dark versions of one colour, numbered 50 (lightest) to 950 (darkest). You need them for hover states, borders and backgrounds."],
              ["k-means", "The method used to group similar colours together. A well-known algorithm from the 1950s. Not AI, no API key. It runs in about 3 milliseconds."],
              ["OKLab", "A way of describing colours where equal numbers mean equal visible difference. Grouping colours in OKLab instead of RGB is why this tool doesn't hand back three near-identical blues."],
              ["medoid", "The real colour from a group that best represents it, as opposed to the group's average, which might be a colour that was never in your picture."],
              ["deterministic", "Same picture in, same colours out, every time. Means you can save the result and trust it won't change."],
              ["gamut", "The set of colours a screen can actually display. Some colours exist in maths but not on your monitor."],
            ] as const
          ).map(([term, meaning]) => (
            <div key={term} className="contents">
              <dt className="font-mono text-[12px] text-txt sm:text-right">{term}</dt>
              <dd className="text-[13px] leading-relaxed">{meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[13px]">
          The{" "}
          <a
            href="https://github.com/KodeSage/palette-forge/blob/main/docs/glossary.md"
            target="_blank"
            rel="noreferrer"
            className="text-txt underline underline-offset-2 hover:text-accent"
          >
            full glossary
          </a>{" "}
          covers everything else.
        </p>

          <footer className="mt-16 border-t border-line pt-6 font-mono text-[11px] text-faint">
            <Link href="/" className="hover:text-accent">
              ← Back to the forge
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
