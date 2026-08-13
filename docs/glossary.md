# Glossary

Every technical word used anywhere in this project, explained plainly. No prior knowledge
assumed.

Ordered roughly from "you'll meet this first" to "you'll probably never need this."

---

## Colour basics

### Hex code

A colour written as `#4CC9F0`.

The `#` marks it as a colour. The six characters are three pairs: how much **red**, how much
**green**, how much **blue**. `00` is none, `FF` is the maximum.

- `#FF0000` is all red, no green, no blue → red
- `#000000` is none of anything → black
- `#FFFFFF` is all of everything → white

You don't need to do this maths. Copy the code, paste it, get the colour.

### RGB

The same idea as hex, written as three ordinary numbers from 0 to 255 instead:
`rgb(76, 201, 240)`.

`#4CC9F0` and `rgb(76, 201, 240)` are the exact same colour, spelled differently.

### HSL

Another way to write a colour, using three ideas that are easier for humans:

- **Hue**, which colour it is (red? blue? green?), as an angle from 0 to 360
- **Saturation**, how vivid it is, from grey (0%) to intense (100%)
- **Lightness**, how bright it is, from black (0%) to white (100%)

Useful because "make it a bit lighter" is a small change to one number.

### Palette

A set of colours chosen to work together.

### Swatch

One single colour within a palette. The coloured rectangles in the app are swatches.

---

## What this tool produces

### Design token

A colour saved under a **name** instead of scattered around as a raw code.

Rather than typing `#4CC9F0` in forty places, you define it once:

```css
--primary: #4cc9f0;
```

…and then use `var(--primary)` everywhere. Change your brand colour later, edit one line.

That's all a design token is: **a colour with a name and one home.**

### Role

What a colour is *for*, rather than what it looks like.

This tool assigns six: `primary` (main brand colour), `accent` (secondary highlight), `ink`
(darkest, for text), `paper` (lightest, for backgrounds), `neutral` (greys), and `support`
(everything else).

Roles are why the generated code says `--primary` instead of `--color-3`.

### Coverage

How much of your picture is that colour, as a percentage. A logo that's mostly blue will
show blue at a high coverage.

### Ramp (also: scale, tonal scale)

Light-to-dark versions of a single colour.

You rarely need just one blue. You need a pale blue for a highlighted row, a mid blue for a
button, and a dark blue for that button when someone hovers over it.

The stops are numbered `50` (lightest) through `950` (darkest), with `500` around the
middle. This numbering is a widespread convention. Tailwind and most design systems use it.

### Theme

A complete set of named colours covering every part of an interface: background, text,
buttons, borders, error messages, and their dark-mode equivalents.

A palette is raw colours. A theme is a palette with every job assigned.

---

## Readability

### Contrast

How different two colours are in brightness.

Black on white is maximum contrast, so it is easy to read. Light grey on white is low
contrast, so it is hard to read.

### Contrast ratio

Contrast as a number, from `1:1` (identical colours, invisible) to `21:1` (black on white).

Higher is easier to read.

### WCAG

**W**eb **C**ontent **A**ccessibility **G**uidelines, the international standard for making
websites usable by everyone, including people with low vision.

It's what accessibility audits check, what Lighthouse measures, and in many countries what
the law requires.

### AA and AAA

WCAG's two levels of strictness.

| | Needs | In practice |
|---|---|---|
| **AA** | 4.5:1 for normal text | The standard almost everyone targets |
| **AAA** | 7:1 for normal text | Stricter; hard to hit with brand colours |

Large text (roughly 24px and up, or 18.6px bold) is allowed 3:1 for AA, because bigger text
is easier to read.

**If you remember one number: 4.5.**

### Luminance

How bright a colour is *to the human eye*, rather than mathematically.

Green looks much brighter than blue even at identical numeric values, because your eye is more
sensitive to green. Luminance accounts for that, which is why contrast is calculated from it
rather than from the raw numbers.

---

## How the extraction works

### Quantisation

Reducing thousands of slightly-different colours down to a handful of representative ones.

A photograph might contain 50,000 distinct colours. You want six. Quantisation is the
process of choosing which six.

### k-means

The specific method used to do that.

In plain terms: *"Sort every colour in the picture into 6 groups, where each group contains
colours that are similar to each other. Then take one colour to represent each group."*

The `k` is just how many groups you asked for, which is the **Colours** slider in the app.

It's a well-known algorithm from the 1950s. Not AI, no model, no API key. It's arithmetic,
and it runs in about 3 milliseconds.

### Cluster

One of those groups. Six colours out means six clusters.

### Centroid and medoid

Two ways to pick the one colour that represents a cluster.

- **Centroid**, the *average* of every colour in the group. Problem: the average might be a
  colour that isn't actually in your picture. Average a red logo on white and you get pink.
- **Medoid**, the real colour from the group that sits closest to the middle. It's
  guaranteed to be a colour that genuinely appears in your image.

**This tool uses medoids.** That's why dropping a flat logo gives you back its exact hex
code, rather than something two shades off.

### Deterministic

Same input always gives the same output.

Drop the same logo twice, get the same palette twice. Sounds obvious, but many colour tools
have a random element and give you something different each run.

Determinism matters because it means you can save the result, commit it to version control,
and write a test that fails if it ever changes.

### Seed

A starting number for the "random" choices the algorithm makes.

Same seed → same choices → same palette. Change the seed and you get a different but equally
valid grouping. That's what **"Try a different split"** does.

---

## Colour spaces

### Colour space

A system for describing colours as numbers. RGB and HSL are both colour spaces.

Different spaces are good for different jobs. Some are easy for screens, some match human
perception better.

### Perceptual colour space

A colour space where **equal numeric distance means equal visible difference.**

RGB isn't one. Two colours 10 units apart in RGB might look identical, or obviously
different, depending on where in the range they sit. That's a problem when you're asking a
computer to group "similar" colours, because it groups by the wrong notion of similar.

### CIELAB (also: Lab)

A perceptual colour space from 1976. A big improvement on RGB, still widely used. Somewhat
weak in the blues.

### OKLab

A perceptual colour space from 2020. Same idea as CIELAB, better maths, particularly around
blues.

**This tool clusters in OKLab by default.** That's the single change that stops it returning
three near-identical blues and dropping your accent colour.

### OKLCH

OKLab rearranged into the three ideas humans think in: lightness, chroma (vividness) and
hue (which colour), the same way HSL rearranges RGB.

Used here for building ramps, because "make this 20% darker but keep it the same blue" is a
single clean adjustment in OKLCH and a mess in RGB.

### Gamut

The set of colours a screen can physically display.

Some colours you can describe mathematically simply don't exist on a screen. Think of a vivid,
glowing blue at 95% brightness, for example. It's a real colour in the maths and an
impossible one on your monitor.

### Gamut mapping

Adjusting an impossible colour into the nearest possible one.

The naive way is to clamp the numbers, but that shifts the hue, so a clipped blue comes out
purple. This tool instead keeps the lightness and hue and gently reduces the vividness until
the colour fits.

That's why the dark end of a generated ramp stays the right colour instead of going muddy.

---

## Formats you might see

### CSS custom properties (also: CSS variables)

The standard way to name a colour in CSS:

```css
:root {
  --primary: #4cc9f0;
}
```

Then use it anywhere with `var(--primary)`.

### Tailwind

A popular CSS framework where you write `class="bg-blue-500"` instead of separate stylesheet
rules. Version 4 lets you define your own colours in a `@theme` block.

### shadcn/ui

A widely-used collection of pre-built React components. It expects a specific set of named
colours (`--background`, `--foreground`, `--primary`, and so on).

The `shadcn` output gives you exactly that set, for light and dark mode, with every
text-on-background pair already checked and corrected for readability.

### DTCG

**D**esign **T**okens **C**ommunity **G**roup format, an official W3C standard for writing
design tokens as JSON.

Useful because Figma, Style Dictionary and Tokens Studio can all read it, so one file feeds
your design tools and your code.

### SVG

An image format made of shapes rather than pixels. Stays sharp at any size. The tool can
output your palette as an SVG card for pasting into a README or a pull request.

---

## Developer terms

### npm / npx

**npm** is where JavaScript packages live, and the command that installs them.

**npx** runs a package *once* without installing it permanently, which is why
`npx palette-forge logo.png` works with nothing set up.

### CLI

**C**ommand **L**ine **I**nterface. A tool you run by typing rather than clicking.

### ESM

The modern system for splitting JavaScript across files (`import` / `export`). This package
is ESM-only.

### Tree-shaking

Your build tool automatically discarding code you never used, so your users download less.

### Gzipped

Compressed for transfer over the internet. The number that actually matters for page weight
and "11.6 KB gzipped" is what a visitor really downloads.

### Web Worker

A way to run code on a separate thread so the page doesn't freeze. Useful for big images.

### Headless

A component or hook that handles the *logic* but gives you no visual design, so you can
style it however you like. The React hooks here are headless.
