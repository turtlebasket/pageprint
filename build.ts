import { build } from "bun";
import { mkdir } from "fs/promises";
import { deflateSync } from "zlib";

const ICON_SIZES = [16, 32, 48, 128] as const;

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(4 + 4 + data.length + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  const crcData = new Uint8Array(4 + data.length);
  for (let i = 0; i < 4; i++) crcData[i] = type.charCodeAt(i);
  crcData.set(data, 4);
  view.setUint32(8 + data.length, crc32(crcData));
  return chunk;
}

function generatePng(size: number): Uint8Array {
  // RGBA pixels: blue background with white document icon
  const pixels = new Uint8Array(size * size * 4);
  const blue = [59, 130, 246, 255]; // #3B82F6
  const white = [255, 255, 255, 255];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inDocX = x >= size * 0.25 && x < size * 0.75;
      const inDocY = y >= size * 0.375 && y < size * 0.625;
      const color = inDocX && inDocY ? white : blue;
      pixels.set(color, i);
    }
  }

  // PNG filter: prepend 0 (no filter) to each row
  const filtered = new Uint8Array(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    filtered[y * (1 + size * 4)] = 0;
    filtered.set(pixels.subarray(y * size * 4, (y + 1) * size * 4), y * (1 + size * 4) + 1);
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, size);
  ihdrView.setUint32(4, size);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  const compressed = deflateSync(Buffer.from(filtered));
  const idat = new Uint8Array(compressed);

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = createChunk("IHDR", ihdr);
  const idatChunk = createChunk("IDAT", idat);
  const iendChunk = createChunk("IEND", new Uint8Array(0));

  const png = new Uint8Array(
    signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length
  );
  let offset = 0;
  png.set(signature, offset);
  offset += signature.length;
  png.set(ihdrChunk, offset);
  offset += ihdrChunk.length;
  png.set(idatChunk, offset);
  offset += idatChunk.length;
  png.set(iendChunk, offset);
  return png;
}

async function generateIcons() {
  await mkdir("dist/icons", { recursive: true });
  for (const size of ICON_SIZES) {
    await Bun.write(`dist/icons/icon${size}.png`, generatePng(size));
  }
}

async function buildExtension() {
  try {
    await generateIcons();

    // Copy manifest
    const manifest = await Bun.file("src/manifest.json").text();
    await Bun.write("dist/manifest.json", manifest);

    await build({
      entrypoints: ["src/content.ts"],
      outdir: "dist",
      target: "browser",
      format: "esm",
      minify: true,
      sourcemap: "external",
    });

    await build({
      entrypoints: ["src/background.ts"],
      outdir: "dist",
      target: "browser",
      format: "esm",
      minify: true,
      sourcemap: "external",
    });

    console.log("Extension built successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

buildExtension();
