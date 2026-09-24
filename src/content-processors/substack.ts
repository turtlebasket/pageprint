import { extractWithReadability } from "./general";
import type { ContentProcessor, ContentProcessorContext, ProcessorArticle } from "./types";

const SUBSTACK_CONTENT_SELECTOR = ".body.markup";

const SUBSTACK_UI_SELECTORS = [
  "button",
  ".subscription-widget-wrap",
  ".subscription-widget-wrap-editor",
  ".subscription-widget",
  ".subscribe-widget",
  ".post-ufi",
  '[data-component-name="SubscribeWidgetToDOM"]',
] as const;

export const substackContentProcessor: ContentProcessor = {
  id: "substack",

  matches(document: Document, context: ContentProcessorContext): boolean {
    if (document.querySelector(SUBSTACK_CONTENT_SELECTOR) === null) {
      return false;
    }

    if (context.url.hostname === "substack.com" || context.url.hostname.endsWith(".substack.com")) {
      return true;
    }

    return (
      document.querySelector(
        'script[src*="substackcdn.com/bundle/"], link[href*="substackcdn.com/bundle/"]'
      ) !== null
    );
  },

  isReadable(document: Document): boolean {
    const content = document.querySelector(SUBSTACK_CONTENT_SELECTOR);
    return (content?.textContent?.trim().length ?? 0) >= 140;
  },

  extract(document: Document): ProcessorArticle | null {
    const content = document.querySelector<HTMLElement>(SUBSTACK_CONTENT_SELECTOR);
    if (content === null) {
      return null;
    }

    const readabilityDocument = document.cloneNode(true) as Document;
    const readabilityArticle = extractWithReadability(readabilityDocument);

    return {
      title:
        getTextContent(document, "h1.post-title") ??
        getMetaContent(document, 'meta[property="og:title"]') ??
        readabilityArticle?.title ??
        "Untitled",
      content: content.innerHTML,
      byline: readabilityArticle?.byline ?? "",
      excerpt:
        getTextContent(document, ".subtitle") ??
        getMetaContent(document, 'meta[name="description"]') ??
        readabilityArticle?.excerpt ??
        "",
      dir: readabilityArticle?.dir ?? document.documentElement.dir,
      siteName:
        getMetaContent(document, 'meta[property="og:site_name"]') ??
        readabilityArticle?.siteName ??
        "",
      lang: readabilityArticle?.lang ?? document.documentElement.lang,
    };
  },

  normalizeContent(container: HTMLElement): void {
    removeSubstackUi(container);
    unwrapSubstackImageLinks(container);
    normalizeSubstackFootnotes(container);
  },
};

export function normalizeSubstackFootnotes(container: HTMLElement): void {
  const footnotes = Array.from(container.querySelectorAll<HTMLElement>(".footnote"));
  if (footnotes.length === 0) {
    return;
  }

  const doc = container.ownerDocument;

  container
    .querySelectorAll<HTMLAnchorElement>('a.footnote-anchor[href^="#footnote-"]')
    .forEach((anchor) => {
      const number = getFootnoteNumberFromReference(anchor);
      const reference = doc.createElement("sup");
      reference.className = "pageprint-footnote-ref";
      reference.dataset["pageprintFootnote"] = number;
      reference.setAttribute("aria-label", `Footnote ${number}`);
      reference.textContent = number;
      anchor.replaceWith(reference);
    });

  const section = doc.createElement("section");
  section.className = "pageprint-footnotes";

  const heading = doc.createElement("h2");
  heading.textContent = "Footnotes";
  section.appendChild(heading);

  const list = doc.createElement("ol");
  section.appendChild(list);

  footnotes.forEach((footnote, index) => {
    const number = getFootnoteNumberFromDefinition(footnote, index + 1);
    const item = doc.createElement("li");
    item.className = "pageprint-footnote";
    item.dataset["pageprintFootnote"] = number;

    const numericValue = Number(number);
    if (Number.isInteger(numericValue) && numericValue > 0) {
      item.value = numericValue;
    }

    const content = footnote.querySelector<HTMLElement>(".footnote-content");
    if (content !== null) {
      while (content.firstChild !== null) {
        item.appendChild(content.firstChild);
      }
    } else {
      const numberElement = footnote.querySelector(".footnote-number");
      Array.from(footnote.childNodes).forEach((node) => {
        if (node !== numberElement) {
          item.appendChild(node);
        }
      });
    }

    list.appendChild(item);
    footnote.remove();
  });

  container.appendChild(section);
}

function removeSubstackUi(container: HTMLElement): void {
  SUBSTACK_UI_SELECTORS.forEach((selector) => {
    container.querySelectorAll(selector).forEach((element) => element.remove());
  });
}

function unwrapSubstackImageLinks(container: HTMLElement): void {
  const anchors = Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href]"));

  anchors.forEach((anchor) => {
    const href = anchor.getAttribute("href") ?? "";
    const isSubstackImageLink =
      anchor.querySelector("img") !== null &&
      (anchor.classList.contains("image-link") || href.includes("substackcdn.com/image/fetch/"));

    if (isSubstackImageLink) {
      unwrapElement(anchor);
    }
  });
}

function unwrapElement(element: Element): void {
  const parent = element.parentNode;
  if (parent === null) {
    return;
  }

  while (element.firstChild !== null) {
    parent.insertBefore(element.firstChild, element);
  }

  element.remove();
}

function getFootnoteNumberFromReference(anchor: HTMLAnchorElement): string {
  const target = anchor.getAttribute("href") ?? "";
  const targetNumber = target.match(/^#footnote-(\d+)$/)?.[1];
  return targetNumber ?? anchor.textContent?.trim() ?? "";
}

function getFootnoteNumberFromDefinition(footnote: HTMLElement, fallback: number): string {
  const numberElement = footnote.querySelector<HTMLElement>(".footnote-number");
  const idNumber = numberElement?.id.match(/^footnote-(\d+)$/)?.[1];
  return idNumber ?? numberElement?.textContent?.trim() ?? String(fallback);
}

function getTextContent(document: Document, selector: string): string | null {
  const value = document.querySelector(selector)?.textContent?.trim();
  return value !== undefined && value.length > 0 ? value : null;
}

function getMetaContent(document: Document, selector: string): string | null {
  const value = document.querySelector<HTMLMetaElement>(selector)?.content.trim();
  return value !== undefined && value.length > 0 ? value : null;
}
