import { Readability } from "@mozilla/readability";
import type { ExtractedContent } from "./types";

export class ContentExtractor {
  private static stripUnwantedElements(htmlContent: string): string {
    const tempDiv = window.document.createElement("div");
    tempDiv.innerHTML = htmlContent;

    const unwantedSelectors = ["video", "audio", "iframe", "embed", "object", "source", "track"];

    unwantedSelectors.forEach((selector) => {
      const elements = tempDiv.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    });

    return tempDiv.innerHTML;
  }

  public static extractContent(document: Document): ExtractedContent | null {
    try {
      console.log("[ContentExtractor] Starting Readability extraction...");

      const documentClone = document.cloneNode(true) as Document;
      const reader = new Readability(documentClone);
      const article = reader.parse();

      if (!article) {
        console.error("[ContentExtractor] Readability returned null");
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

      const cleanedContent = this.stripUnwantedElements(article.content);

      console.log("[ContentExtractor] Extraction successful:", {
        title: article.title,
        contentLength: cleanedContent.length,
        byline,
        excerpt: excerpt.substring(0, 100),
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
}
