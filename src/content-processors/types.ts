export interface ContentProcessorContext {
  pageUrl: string;
  url: URL;
}

export interface ProcessorArticle {
  title: string;
  content: string;
  byline: string;
  excerpt: string;
  dir: string;
  siteName: string;
  lang: string;
}

export type MaybePromise<T> = T | Promise<T>;

export interface ContentProcessor {
  readonly id: string;
  matches(document: Document, context: ContentProcessorContext): boolean;
  isReadable(document: Document, context: ContentProcessorContext): boolean;
  extract(
    document: Document,
    context: ContentProcessorContext
  ): MaybePromise<ProcessorArticle | null>;
  normalizeContent(container: HTMLElement, context: ContentProcessorContext): MaybePromise<void>;
}
