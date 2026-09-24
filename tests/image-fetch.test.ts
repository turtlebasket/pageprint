import { afterEach, expect, test } from "bun:test";
import { fetchImageDataUrl } from "../src/image-fetch";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("embeds image bytes when content-type is generic", async () => {
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
  ]);

  globalThis.fetch = async () =>
    new Response(pngBytes, {
      headers: {
        "content-type": "application/octet-stream",
      },
    });

  await expect(fetchImageDataUrl("https://cdn.example.com/image")).resolves.toBe(
    `data:image/png;base64,${Buffer.from(pngBytes).toString("base64")}`
  );
});
