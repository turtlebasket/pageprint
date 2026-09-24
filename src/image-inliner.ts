export type ImageDataFetcher = (url: string) => Promise<string | null>;

const MAX_TOTAL_IMAGE_DATA_URL_CHARS = 24 * 1024 * 1024;

const LIVE_SRC_ATTRIBUTE = "data-pageprint-current-src";

const LAZY_SRC_ATTRIBUTES = [
  "data-src",
  "data-lazy-src",
  "data-original",
  "data-canonical-src",
  "data-image-src",
  "data-original-src",
  "data-full-url",
  "data-large-file",
] as const;
const LAZY_SRCSET_ATTRIBUTES = ["data-srcset", "data-lazy-srcset"] as const;

const IMAGE_ATTRIBUTES_TO_REMOVE = [
  "crossorigin",
  "data-canonical-src",
  "data-full-url",
  "data-image-src",
  "data-large-file",
  "data-lazy-src",
  "data-lazy-srcset",
  "data-original",
  "data-original-src",
  "data-pageprint-current-src",
  "data-src",
  "data-srcset",
  "loading",
  "referrerpolicy",
] as const;

interface SrcsetCandidate {
  descriptor: string;
  score: number;
  url: string;
}

interface NormalizedImage {
  fallbackSrc: string | null;
  sourceUrl: string;
}

export async function processImagesForStandaloneDocument(
  container: HTMLElement,
  baseUrl: string,
  imageFetcher?: ImageDataFetcher
): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  let totalImageDataUrlChars = 0;

  for (const img of images) {
    const normalizedImage = normalizeImageAttributes(img, baseUrl);
    if (normalizedImage === null) {
      img.remove();
      continue;
    }

    let isInlined = false;
    if (imageFetcher !== undefined && !normalizedImage.sourceUrl.startsWith("data:image/")) {
      const dataUrl = await imageFetcher(normalizedImage.sourceUrl);
      if (
        dataUrl !== null &&
        dataUrl.startsWith("data:image/") &&
        totalImageDataUrlChars + dataUrl.length <= MAX_TOTAL_IMAGE_DATA_URL_CHARS
      ) {
        img.setAttribute("src", dataUrl);
        img.removeAttribute("sizes");
        img.removeAttribute("srcset");
        totalImageDataUrlChars += dataUrl.length;
        isInlined = true;
      }
    }

    if (!isInlined) {
      if (normalizedImage.fallbackSrc === null) {
        img.remove();
        continue;
      }

      img.setAttribute("src", normalizedImage.fallbackSrc);
      if (imageFetcher !== undefined) {
        img.removeAttribute("sizes");
        img.removeAttribute("srcset");
      }
    }

    IMAGE_ATTRIBUTES_TO_REMOVE.forEach((attr) => img.removeAttribute(attr));
  }

  container.querySelectorAll("source").forEach((source) => source.remove());
}

function normalizeImageAttributes(img: HTMLImageElement, baseUrl: string): NormalizedImage | null {
  const rawSrc = getAttributeValue(img, "src");
  const liveSrc = getAttributeValue(img, LIVE_SRC_ATTRIBUTE);
  const lazySrc = getFirstAttributeValue(img, LAZY_SRC_ATTRIBUTES);
  const rawSrcset = getAttributeValue(img, "srcset");
  const lazySrcset = getFirstAttributeValue(img, LAZY_SRCSET_ATTRIBUTES);
  const pictureSrcset = getPictureSourceSrcset(img);
  const linkedImageUrl = getLinkedImageUrl(img, baseUrl);

  const normalizedLiveSrc = normalizeImageUrl(liveSrc, baseUrl);
  const normalizedSrc = normalizeImageUrl(rawSrc, baseUrl);
  const normalizedLazySrc = normalizeImageUrl(lazySrc, baseUrl);
  const shouldPreferLazySrc =
    normalizedLazySrc !== null &&
    (normalizedSrc === null || isLikelyPlaceholderSrc(rawSrc, normalizedSrc));
  const srcset = shouldPreferLazySrc
    ? (lazySrcset ?? pictureSrcset)
    : (rawSrcset ?? lazySrcset ?? pictureSrcset);
  const normalizedSrcset = srcset !== null ? normalizeSrcset(srcset, baseUrl) : null;
  const bestSrcsetCandidate =
    normalizedSrcset !== null ? chooseBestSrcsetCandidate(normalizedSrcset) : null;
  const fallbackSrc = chooseBetweenSrcAndLazySrc(
    shouldPreferLazySrc,
    normalizedSrc,
    normalizedLazySrc
  );

  const srcsetFallback = bestSrcsetCandidate?.url ?? normalizedSrcset?.candidates[0]?.url ?? null;
  const linkedImageFallback =
    linkedImageUrl !== null && isLikelyImageUrl(linkedImageUrl) ? linkedImageUrl : null;
  const chosenSrc = normalizedLiveSrc ?? srcsetFallback ?? fallbackSrc ?? linkedImageUrl ?? null;

  if (chosenSrc === null) {
    return null;
  }

  if (normalizedSrcset !== null && normalizedSrcset.serialized.length > 0) {
    img.setAttribute("srcset", normalizedSrcset.serialized);
  } else {
    img.removeAttribute("srcset");
  }

  return {
    fallbackSrc: normalizedLiveSrc ?? fallbackSrc ?? srcsetFallback ?? linkedImageFallback,
    sourceUrl: chosenSrc,
  };
}

function chooseBetweenSrcAndLazySrc(
  shouldPreferLazySrc: boolean,
  normalizedSrc: string | null,
  normalizedLazySrc: string | null
): string | null {
  if (shouldPreferLazySrc && normalizedLazySrc !== null) {
    return normalizedLazySrc;
  }

  return normalizedSrc ?? normalizedLazySrc;
}

function getFirstAttributeValue(element: Element, attributes: readonly string[]): string | null {
  for (const attr of attributes) {
    const value = getAttributeValue(element, attr);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function getPictureSourceSrcset(img: HTMLImageElement): string | null {
  const picture = img.closest("picture");
  if (picture === null) {
    return null;
  }

  const sources = Array.from(picture.querySelectorAll("source"));
  for (const source of sources) {
    const srcset =
      getAttributeValue(source, "srcset") ?? getFirstAttributeValue(source, LAZY_SRCSET_ATTRIBUTES);
    if (srcset !== null) {
      return srcset;
    }
  }

  return null;
}

function getLinkedImageUrl(img: HTMLImageElement, baseUrl: string): string | null {
  const anchor = img.closest("a[href]");
  if (anchor === null) {
    return null;
  }

  return normalizeImageUrl(getAttributeValue(anchor, "href"), baseUrl);
}

function getAttributeValue(element: Element, attribute: string): string | null {
  const value = element.getAttribute(attribute)?.trim();
  return value !== undefined && value.length > 0 ? value : null;
}

function isLikelyImageUrl(url: string): boolean {
  if (url.startsWith("data:image/")) {
    return true;
  }

  try {
    return /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function normalizeImageUrl(rawUrl: string | null, baseUrl: string): string | null {
  if (rawUrl === null) {
    return null;
  }

  if (rawUrl.startsWith("data:image/")) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl, baseUrl);
    if (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "blob:"
    ) {
      return parsed.href;
    }
  } catch {
    return null;
  }

  return null;
}

function normalizeSrcset(
  srcset: string,
  baseUrl: string
): { candidates: SrcsetCandidate[]; serialized: string } {
  const candidates = parseSrcset(srcset)
    .map((candidate) => {
      const url = normalizeImageUrl(candidate.url, baseUrl);
      if (url === null) {
        return null;
      }

      return {
        descriptor: candidate.descriptor,
        score: getDescriptorScore(candidate.descriptor),
        url,
      };
    })
    .filter((candidate): candidate is SrcsetCandidate => candidate !== null);

  return {
    candidates,
    serialized: candidates
      .map((candidate) =>
        candidate.descriptor ? `${candidate.url} ${candidate.descriptor}` : candidate.url
      )
      .join(", "),
  };
}

function parseSrcset(srcset: string): { descriptor: string; url: string }[] {
  const entries = srcset.match(/(?:data:[^\s,]+,[^\s]+|[^,\s]+)(?:\s+[^,]+)?/gi) ?? [];

  return entries.map((entry) => {
    const [url = "", ...descriptorParts] = entry.trim().split(/\s+/);
    return {
      descriptor: descriptorParts.join(" "),
      url,
    };
  });
}

function chooseBestSrcsetCandidate(srcset: {
  candidates: SrcsetCandidate[];
  serialized: string;
}): SrcsetCandidate | null {
  return srcset.candidates.reduce<SrcsetCandidate | null>((best, candidate) => {
    if (best === null || candidate.score > best.score) {
      return candidate;
    }

    return best;
  }, null);
}

function getDescriptorScore(descriptor: string): number {
  const widthMatch = descriptor.match(/^(\d+(?:\.\d+)?)w$/);
  if (widthMatch?.[1] !== undefined) {
    return Number(widthMatch[1]);
  }

  const densityMatch = descriptor.match(/^(\d+(?:\.\d+)?)x$/);
  if (densityMatch?.[1] !== undefined) {
    return Number(densityMatch[1]) * 1000;
  }

  return 1;
}

function isLikelyPlaceholderSrc(rawSrc: string | null, normalizedSrc: string): boolean {
  if (rawSrc === null) {
    return true;
  }

  const lowerRawSrc = rawSrc.toLowerCase();
  const lowerNormalizedSrc = normalizedSrc.toLowerCase();

  return (
    lowerRawSrc.startsWith("data:image/gif") ||
    lowerNormalizedSrc.includes("placeholder") ||
    lowerNormalizedSrc.includes("spacer") ||
    lowerNormalizedSrc.includes("transparent")
  );
}
