const MAX_INLINE_IMAGE_BYTES = 8 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
};

interface FetchImageDataOptions {
  referrer?: string;
}

export async function fetchImageDataUrl(
  url: string,
  options: FetchImageDataOptions = {}
): Promise<string | null> {
  if (url.startsWith("data:image/")) {
    return url;
  }

  if (!isFetchableImageUrl(url)) {
    return null;
  }

  try {
    const referrer = getFetchReferrer(options.referrer);
    const response = await fetch(url, {
      cache: "force-cache",
      credentials: "include",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      ...(referrer !== null
        ? {
            referrer,
            referrerPolicy: "strict-origin-when-cross-origin" as ReferrerPolicy,
          }
        : {}),
    });

    if (!response.ok) {
      return null;
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_INLINE_IMAGE_BYTES) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_INLINE_IMAGE_BYTES) {
      return null;
    }

    const mimeType = getImageMimeType(url, response.headers.get("content-type"), buffer);
    if (mimeType === null) {
      return null;
    }

    return `data:${mimeType};base64,${arrayBufferToBase64(buffer)}`;
  } catch {
    return null;
  }
}

function getFetchReferrer(referrer: string | undefined): string | null {
  if (referrer === undefined) {
    return null;
  }

  try {
    const parsed = new URL(referrer);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    return null;
  }

  return null;
}

function isFetchableImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "blob:"
    );
  } catch {
    return false;
  }
}

function getImageMimeType(
  url: string,
  contentType: string | null,
  buffer: ArrayBuffer
): string | null {
  const normalizedContentType = contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (normalizedContentType.startsWith("image/")) {
    return normalizedContentType;
  }

  const sniffedMimeType = sniffImageMimeType(buffer);
  if (sniffedMimeType !== null) {
    return sniffedMimeType;
  }

  try {
    const extension = new URL(url).pathname.split(".").pop()?.toLowerCase();
    if (extension !== undefined && extension.length > 0) {
      return MIME_BY_EXTENSION[extension] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

function sniffImageMimeType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);

  if (bytes.length >= 12) {
    const riff = String.fromCharCode(...bytes.subarray(0, 4));
    const webp = String.fromCharCode(...bytes.subarray(8, 12));
    if (riff === "RIFF" && webp === "WEBP") {
      return "image/webp";
    }
  }

  if (bytes.length >= 12) {
    const ftyp = String.fromCharCode(...bytes.subarray(4, 8));
    const brand = String.fromCharCode(...bytes.subarray(8, 12));
    if (ftyp === "ftyp" && (brand === "avif" || brand === "avis")) {
      return "image/avif";
    }
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 6) {
    const gif = String.fromCharCode(...bytes.subarray(0, 6));
    if (gif === "GIF87a" || gif === "GIF89a") {
      return "image/gif";
    }
  }

  const textStart = new TextDecoder()
    .decode(bytes.subarray(0, Math.min(bytes.length, 256)))
    .trimStart();
  if (textStart.startsWith("<svg") || textStart.startsWith("<?xml")) {
    return "image/svg+xml";
  }

  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}
