import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { processLinksForPrint } from "../src/link-processor";

function createDocument(articleHtml: string): Document {
  const dom = new JSDOM(`<article class="readable-content">${articleHtml}</article>`);
  return dom.window.document as unknown as Document;
}

test("reference mode preserves linked images without treating them as links", () => {
  const doc = createDocument(
    '<a href="https://example.com/full-size"><img src="data:image/jpeg;base64,embedded" alt="Pig chase"></a>'
  );

  processLinksForPrint(doc, "references");

  const article = doc.querySelector(".readable-content");
  const image = article?.querySelector("img");

  expect(image?.getAttribute("src")).toBe("data:image/jpeg;base64,embedded");
  expect(article?.querySelector("a")).toBeNull();
  expect(article?.textContent).not.toContain("[L1]");
  expect(article?.querySelector(".link-reference-item")).toBeNull();
});

test("reference mode preserves fragment labels without adding them to links", () => {
  const doc = createDocument('<p>Claim<sup><a href="#footnote-1">1</a></sup></p>');

  processLinksForPrint(doc, "references");

  const article = doc.querySelector(".readable-content");
  expect(article?.querySelector("p")?.textContent).toBe("Claim1");
  expect(article?.querySelector("a")).toBeNull();
  expect(article?.querySelector(".link-references")).toBeNull();
});

test("none mode removes links without removing their images", () => {
  const doc = createDocument(
    '<a href="https://example.com/full-size"><img src="data:image/png;base64,embedded" alt="Photo"></a>'
  );

  processLinksForPrint(doc, "none");

  const article = doc.querySelector(".readable-content");
  expect(article?.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,embedded");
  expect(article?.querySelector("a")).toBeNull();
  expect(article?.textContent).not.toContain("[L1]");
  expect(article?.querySelector(".link-references")).toBeNull();
});

test("reference mode preserves linked text and builds the reference list", () => {
  const doc = createDocument('<p>Read <a href="https://example.com/story">the story</a>.</p>');

  processLinksForPrint(doc, "references");

  const article = doc.querySelector(".readable-content");
  expect(article?.querySelector("p")?.textContent).toBe("Read the story [L1].");
  expect(article?.querySelector("a")).toBeNull();
  expect(article?.querySelector(".link-reference-item")?.textContent).toBe(
    "[L1]https://example.com/story"
  );
});
