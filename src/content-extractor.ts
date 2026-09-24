import { selectContentProcessor } from "./content-processors/registry";
import type { ContentProcessor, ContentProcessorContext } from "./content-processors/types";
import { fetchImageDataUrl } from "./image-fetch";
import { processImagesForStandaloneDocument, type ImageDataFetcher } from "./image-inliner";
import {
  MessageType,
  type ExtractedContent,
  type MessageRequest,
  type MessageResponse,
} from "./types";

interface ExtractContentOptions {
  imageFetcher?: ImageDataFetcher;
}

export class ContentExtractor {
  public static isProbablyReaderable(document: Document): boolean {
    try {
      const context = this.createProcessorContext(document);
      const processor = selectContentProcessor(document, context);
      const result = processor.isReadable(document, context);
      console.log(`[ContentExtractor] ${processor.id} readability check result:`, result);
      return result;
    } catch (error) {
      console.error("[ContentExtractor] Readability check failed:", error);
      return false;
    }
  }
  private static async stripUnwantedElements(
    htmlContent: string,
    imageFetcher: ImageDataFetcher,
    processor: ContentProcessor,
    context: ContentProcessorContext,
    ownerDocument: Document
  ): Promise<string> {
    const tempDiv = ownerDocument.createElement("div");
    tempDiv.innerHTML = htmlContent;

    await processor.normalizeContent(tempDiv, context);

    const unwantedSelectors = ["video", "audio", "iframe", "embed", "object", "track"];

    unwantedSelectors.forEach((selector) => {
      const elements = tempDiv.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    });

    await processImagesForStandaloneDocument(tempDiv, context.pageUrl, imageFetcher);

    return tempDiv.innerHTML;
  }

  public static async extractContent(
    document: Document,
    options: ExtractContentOptions = {}
  ): Promise<ExtractedContent | null> {
    try {
      const context = this.createProcessorContext(document);
      const processor = selectContentProcessor(document, context);
      console.log(`[ContentExtractor] Starting ${processor.id} extraction...`);

      const documentClone = document.cloneNode(true) as Document;
      this.copyLiveImageSources(document, documentClone);
      const article = await processor.extract(documentClone, context);

      if (!article) {
        console.error(`[ContentExtractor] ${processor.id} processor returned null`);
        return null;
      }

      // Get site name for internal tracking only
      const siteName =
        article.siteName || (typeof window !== "undefined" ? window.location.hostname : "");

      // Only use byline if it exists and doesn't match the site name
      let byline = article.byline || "";
      if (byline && byline.toLowerCase() === siteName.toLowerCase()) {
        byline = "";
      }

      const excerpt = article.excerpt || "";

      const cleanedContent = await this.stripUnwantedElements(
        article.content,
        options.imageFetcher ?? this.fetchImageAsDataUrl,
        processor,
        context,
        document
      );

      console.log("[ContentExtractor] Extraction successful:", {
        title: article.title,
        contentLength: cleanedContent.length,
        byline,
        excerpt: excerpt.substring(0, 100),
        processor: processor.id,
      });

      return {
        title: article.title || "Untitled",
        content: cleanedContent,
        byline,
        excerpt,
        dir: article.dir || document.documentElement.dir || "ltr",
        siteName,
        lang: article.lang || document.documentElement.lang || "en",
      };
    } catch (error) {
      console.error("[ContentExtractor] Content extraction failed:", error);
      return null;
    }
  }

  private static createProcessorContext(document: Document): ContentProcessorContext {
    const pageUrl =
      document.URL || (typeof window !== "undefined" ? window.location.href : "about:blank");

    try {
      return { pageUrl, url: new URL(pageUrl) };
    } catch {
      return { pageUrl: "about:blank", url: new URL("about:blank") };
    }
  }

  private static async fetchImageAsDataUrl(url: string): Promise<string | null> {
    if (url.startsWith("data:image/")) {
      return url;
    }

    const shouldUseBackgroundFirst = !url.startsWith("blob:");

    if (shouldUseBackgroundFirst) {
      const backgroundResult = await ContentExtractor.fetchImageDataViaBackground(url);
      if (backgroundResult !== null) {
        return backgroundResult;
      }
    }

    const directResult = await fetchImageDataUrl(url, { referrer: window.location.href });
    if (directResult !== null || !url.startsWith("blob:")) {
      return directResult;
    }

    return ContentExtractor.fetchImageDataViaBackground(url);
  }

  private static copyLiveImageSources(sourceDocument: Document, clonedDocument: Document): void {
    const sourceImages = Array.from(sourceDocument.querySelectorAll("img"));
    const clonedImages = Array.from(clonedDocument.querySelectorAll("img"));

    sourceImages.forEach((sourceImage, index) => {
      const clonedImage = clonedImages[index];
      if (clonedImage === undefined) {
        return;
      }

      const currentSrc = sourceImage.currentSrc.trim();
      if (currentSrc.length > 0) {
        clonedImage.setAttribute("data-pageprint-current-src", currentSrc);
      }
    });
  }

  private static async fetchImageDataViaBackground(url: string): Promise<string | null> {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return null;
    }

    try {
      const response = await chrome.runtime.sendMessage<
        MessageRequest,
        MessageResponse<string | null>
      >({
        type: MessageType.FETCH_IMAGE_DATA,
        data: { pageUrl: window.location.href, url },
      });

      return response.success ? response.data : null;
    } catch {
      return null;
    }
  }
}
