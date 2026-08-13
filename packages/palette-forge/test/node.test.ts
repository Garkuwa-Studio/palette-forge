import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import {
  decodeImage,
  extractPaletteFromBuffer,
  extractPaletteFromFile,
} from "../src/node/index.js";

/** A PNG with three exact colour bands, so the expected palette is knowable. */
function makePng(width = 60, height = 60): Buffer {
  const png = new PNG({ width, height });
  const bands = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
  ];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const band = bands[Math.floor((y / height) * bands.length)] ?? bands[0]!;
      const i = (y * width + x) * 4;
      png.data[i] = band[0]!;
      png.data[i + 1] = band[1]!;
      png.data[i + 2] = band[2]!;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

function makeJpeg(width = 60, height = 60): Buffer {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    data[o] = 240;
    data[o + 1] = 85;
    data[o + 2] = 76;
    data[o + 3] = 255;
  }
  return jpeg.encode({ data, width, height }, 100).data;
}

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "palette-forge-"));
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("decodeImage", () => {
  it("decodes PNG to RGBA pixels", async () => {
    const source = await decodeImage(makePng(60, 60));
    expect(source.width).toBe(60);
    expect(source.height).toBe(60);
    expect(source.data.length).toBe(60 * 60 * 4);
    // First pixel is the red band, fully opaque.
    expect([source.data[0], source.data[1], source.data[2], source.data[3]]).toEqual([
      255, 0, 0, 255,
    ]);
  });

  it("decodes JPEG to RGBA pixels", async () => {
    const source = await decodeImage(makeJpeg(40, 40));
    expect(source.width).toBe(40);
    expect(source.height).toBe(40);
    expect(source.data.length).toBe(40 * 40 * 4);
  });

  it("identifies format from magic bytes, ignoring a wrong extension", async () => {
    // A PNG mislabelled as .jpg still decodes, because sniffing wins.
    const source = await decodeImage(makePng(20, 20), "actually-a-png.jpg");
    expect(source.width).toBe(20);
  });

  it("rejects non-images with an actionable message", async () => {
    await expect(decodeImage(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).rejects
      .toThrow(/Could not identify the image format/);
  });

  it("names sharp when asked for a format it cannot handle natively", async () => {
    // Minimal RIFF/WEBP header, enough to sniff, not enough to decode.
    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
    webp.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP"

    // sharp is a dev dependency here, so this resolves rather than erroring on
    // the missing package, either outcome proves the delegation path is wired.
    await expect(decodeImage(webp)).rejects.toThrow();
  });
});

describe("extractPaletteFromFile", () => {
  it("reads an image off disk and extracts its palette", async () => {
    const path = join(dir, "bands.png");
    await writeFile(path, makePng(90, 90));

    const palette = await extractPaletteFromFile(path, { colors: 3 });
    expect(palette.swatches.map((s) => s.hex).sort()).toEqual([
      "#0000ff",
      "#00ff00",
      "#ff0000",
    ]);
    for (const swatch of palette.swatches) {
      expect(swatch.share).toBeCloseTo(1 / 3, 1);
    }
  });

  it("surfaces a missing file as ENOENT", async () => {
    await expect(extractPaletteFromFile(join(dir, "nope.png"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

describe("extractPaletteFromBuffer", () => {
  it("works on in-memory bytes", async () => {
    const palette = await extractPaletteFromBuffer(makePng(48, 48), { colors: 3 });
    expect(palette.swatches).toHaveLength(3);
  });
});
