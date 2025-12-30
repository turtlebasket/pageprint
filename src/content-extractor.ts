import { Readability, isProbablyReaderable } from "@mozilla/readability";
import type { ExtractedContent } from "./types";

export class ContentExtractor {
  public static isProbablyReaderable(document: Document): boolean {
    try {
      const result = isProbablyReaderable(document);
      console.log("[ContentExtractor] Readability check result:", result);
      return result;
    } catch (error) {
      console.error("[ContentExtractor] Readability check failed:", error);
      return false;
    }
  }
  private static stripUnwantedElements(htmlContent: string): string {
    const tempDiv = window.document.createElement("div");
    tempDiv.innerHTML = htmlContent;

    const unwantedSelectors = ["video", "audio", "iframe", "embed", "object", "source", "track"];

    unwantedSelectors.forEach((selector) => {
      const elements = tempDiv.querySelectorAll(selector);
      elements.forEach((el) => el.remove());
    });

    this.processImages(tempDiv);

    return tempDiv.innerHTML;
  }

  private static processImages(container: HTMLElement): void {
    const images = container.querySelectorAll("img");
    const baseUrl = window.location.href;

    images.forEach((img) => {
      const lazyAttributes = [
        "data-src",
        "data-lazy-src",
        "data-original",
        "data-srcset",
        "data-lazy-srcset",
      ];

      for (const attr of lazyAttributes) {
        if (img.hasAttribute(attr)) {
          const value = img.getAttribute(attr);
          if (value !== null && value.length > 0 && (!img.src || img.src === baseUrl)) {
            if (attr.includes("srcset")) {
              img.setAttribute("srcset", value);
            } else {
              img.src = value;
            }
          }
        }
      }

      if (img.src && img.src.length > 0 && img.src !== baseUrl) {
        if (!img.src.startsWith("data:") && !img.src.startsWith("http")) {
          try {
            const absoluteUrl = new URL(img.src, baseUrl);
            img.src = absoluteUrl.href;
          } catch {
            img.remove();
            return;
          }
        }
      } else {
        img.remove();
        return;
      }

      if (img.hasAttribute("srcset")) {
        const srcset = img.getAttribute("srcset");
        if (srcset !== null && srcset.length > 0) {
          const processedSrcset = srcset
            .split(",")
            .map((entry) => {
              const parts = entry.trim().split(/\s+/);
              const url = parts[0];
              const descriptor = parts[1];
              if (
                url !== undefined &&
                url.length > 0 &&
                !url.startsWith("data:") &&
                !url.startsWith("http")
              ) {
                try {
                  const absoluteUrl = new URL(url, baseUrl);
                  return descriptor !== undefined
                    ? `${absoluteUrl.href} ${descriptor}`
                    : absoluteUrl.href;
                } catch {
                  return "";
                }
              }
              return entry.trim();
            })
            .filter((entry) => entry.length > 0)
            .join(", ");

          if (processedSrcset.length > 0) {
            img.setAttribute("srcset", processedSrcset);
          }
        }
      }

      [
        "loading",
        "data-src",
        "data-lazy-src",
        "data-original",
        "data-srcset",
        "data-lazy-srcset",
      ].forEach((attr) => img.removeAttribute(attr));
    });
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
