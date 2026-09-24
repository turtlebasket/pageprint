import { Readability, isProbablyReaderable } from "@mozilla/readability";
import type { ContentProcessor, ProcessorArticle } from "./types";

export const generalContentProcessor: ContentProcessor = {
  id: "general",

  matches(): boolean {
    return true;
  },

  isReadable(document: Document): boolean {
    return isProbablyReaderable(document);
  },

  extract(document: Document): ProcessorArticle | null {
    return extractWithReadability(document);
  },

  normalizeContent(): void {},
};

export function extractWithReadability(document: Document): ProcessorArticle | null {
  const article = new Readability(document).parse();
  if (article === null) {
    return null;
  }

  return {
    title: article.title,
    content: article.content,
    byline: article.byline,
    excerpt: article.excerpt,
    dir: article.dir,
    siteName: article.siteName,
    lang: article.lang,
  };
}
