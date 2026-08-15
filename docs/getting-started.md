# Getting started

**No jargon. Start here if the other pages looked intimidating.**

---

## What does this thing actually do?

You've got a picture. Your logo, maybe, or a screenshot of a site you like the look of.

There are colours in that picture. You want them as code, so you can use them in your own
site or app.

That's the whole tool. Really.

```
   your logo  ───────►  Palette Forge  ───────►  the colours, as code
```

---

## The two-second version

Open **[palette-forge-web](https://palette-forge-web.vercel.app/)** and drag your picture onto the page.

The colours appear. Click one to copy it. That's you finished.

Nothing to install, no account, and no obligation to read the rest of this page.

---

## What you'll see

Once you drop a picture in, you get four things.

### 1. The colours

Coloured rectangles. Each one shows:

- **The colour code**, like `#4CC9F0`. This is just a name for a colour that computers
  understand. Copy it, paste it into your code, you get that exact colour.
- **A label**, such as `primary`, `ink` or `paper`. See below.
- **A percentage** telling you how much of your picture is that colour. If your logo is mostly blue,
  blue will say something like 60%.

### 2. Labels (what each colour is *for*)

The tool guesses what job each colour should do:

| Label | Plain English |
|---|---|
| **primary** | Your main brand colour. The one people remember. |
| **accent** | A second colour, for highlights and small details. |
| **ink** | The darkest colour. Good for text. |
| **paper** | The lightest colour. Good for backgrounds. |
| **neutral** | A grey. Good for borders and quiet details. |
| **support** | Everything else. |

These are guesses, and guesses miss. Every colour has a dropdown under it, so correct
whatever looks off. You know your brand; the software is inferring it.

### 3. The readability check

Most colour tools skip this bit. It's the bit that saves you.

Some colour combinations are simply hard to read. Light grey text on a white background is
technically text, but good luck. For anyone with less than perfect eyesight it's worse than
awkward, and in a lot of countries getting it wrong is a legal problem.

So the tool checks every possible pair of your colours and says, plainly:

- **PASS**: people can read this. Use it.
- **FAIL**: people will struggle. Don't use this pair for text.

You don't need to understand the numbers next to it. Just look for PASS.

### 4. The code

The bottom section is the actual code, ready to copy.

The tabs across the top are different **flavours** of the same thing. Pick the one that
matches what you're building:

| Tab | Pick this if… |
|---|---|
| **tokens.css** | You're not sure. This one works almost everywhere. |
| **Tailwind v4** | You use Tailwind. |
| **shadcn/ui** | You use shadcn/ui. *(This one does the most work for you.)* |
| **TypeScript** | You want the colours as a JavaScript/TypeScript file. |
| **SCSS**, **DTCG**, **JSON**, **SVG** | You'll know if you need these. |

Press **Copy**. Paste it into your project. You're finished.

---

## Using it from the terminal

Skip this section if you don't use a terminal. The website does the same thing.

Still here? You need [Node.js](https://nodejs.org) installed. Then:

```bash
npx palette-forge my-logo.png
```

`npx` means "download it, run it once, don't leave anything behind." You don't have to
install anything permanently.

Replace `my-logo.png` with the path to your picture. If the picture is sitting in the folder
you're already in, just the filename works.

**To save the code to a file instead of printing it:**

```bash
npx palette-forge my-logo.png --format css --out colors.css
```

That makes a file called `colors.css` with your colours in it.

---

## Common situations

### "It only gave me white and grey!"

Your picture is probably a screenshot, and screenshots are mostly background. White wins on
sheer volume.

Tick **"Ignore background greys"** and your actual colours will surface.

On the terminal, that's `--neutrals`:

```bash
npx palette-forge screenshot.png --neutrals
```

### "I got too many colours that look the same"

Drag the **Colours** slider down. You've asked for more colours than the picture contains,
so it's splitting hairs to fill the quota.

A logo usually only has 2 to 4 real colours. A photograph has more.

### "It missed a colour I can clearly see"

Two things to try, in order:

1. **Turn the Colours slider up.** You might be asking for 4 colours when the picture has 6.
2. **Press "Try a different split."** The tool has to make choices about how to group
   similar colours, and this makes it choose differently. Sometimes that's all it takes.

### "The labels are wrong"

Use the dropdown under each colour to fix them. The tool is guessing; you know your brand.

The labels change the names in the generated code, so it's worth getting them right before
you copy.

### "Is my picture being uploaded somewhere?"

No. It all happens inside your browser, and the picture never leaves your machine.

Don't take my word for it. Open your browser's developer tools, switch to the Network tab,
and drop a picture in. Nothing goes out.

---

## Words you might bump into

The short version. The [glossary](./glossary.md) explains all of these properly.

| Word | Means |
|---|---|
| **hex** / **hex code** | A colour written as `#4CC9F0`. Just a colour name for computers. |
| **palette** | A set of colours that go together. |
| **swatch** | One colour in a palette. |
| **design token** | A colour saved under a name (like `primary`) so you can reuse it everywhere and change it in one place. |
| **contrast** | How different two colours are. High contrast = easy to read. |
| **WCAG** | The official rules for what counts as readable. |
| **ramp** / **scale** | Light-to-dark versions of one colour, for hover states, borders and so on. |

---

## What next?

- Just want the colours? **You're already done.** Go paste them.
- Want to use this inside your own code? → [Package README](../packages/palette-forge/README.md)
- Want the terminal options? → [CLI guide](./cli.md)
- Want ideas for what to build with it? → [Recipes](./recipes.md)
- Confused by a word? → [Glossary](./glossary.md)
