import type { LinkHandling } from "./types";

interface LinkReference {
  id: number;
  url: string;
}

export function processLinksForPrint(doc: Document, mode: LinkHandling): void {
  if (mode === "embed") {
    return;
  }

  const article = doc.querySelector(".readable-content");
  if (article === null) {
    return;
  }

  const anchors = Array.from(article.querySelectorAll<HTMLAnchorElement>("a[href]"));
  const links: LinkReference[] = [];

  anchors.forEach((anchor) => {
    const href = anchor.getAttribute("href")?.trim() ?? "";
    if (mode === "references" && isReferenceableLink(anchor, href)) {
      const id = links.length + 1;
      links.push({ id, url: href });
      anchor.appendChild(doc.createTextNode(` [L${id}]`));
    }

    unwrapElement(anchor);
  });

  if (links.length > 0) {
    article.appendChild(createLinkReferences(doc, links));
  }
}

function isReferenceableLink(anchor: HTMLAnchorElement, href: string): boolean {
  if (href.length === 0 || href.startsWith("#") || anchor.querySelector("img") !== null) {
    return false;
  }

  try {
    const url = new URL(href, anchor.ownerDocument.baseURI);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

function createLinkReferences(doc: Document, links: LinkReference[]): HTMLElement {
  const section = doc.createElement("section");
  section.className = "link-references";

  const heading = doc.createElement("h2");
  heading.textContent = "Links";
  section.appendChild(heading);

  links.forEach((link) => {
    const item = doc.createElement("div");
    item.className = "link-reference-item";

    const id = doc.createElement("span");
    id.className = "link-reference-id";
    id.textContent = `[L${link.id}]`;

    item.appendChild(id);
    item.appendChild(doc.createTextNode(link.url));
    section.appendChild(item);
  });

  return section;
}
