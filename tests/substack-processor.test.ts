import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import { selectContentProcessor } from "../src/content-processors/registry";
import { normalizeSubstackFootnotes } from "../src/content-processors/substack";
import type { ContentProcessorContext } from "../src/content-processors/types";

const SUBSTACK_URL = "https://publication.example/p/example-post";

function createSubstackDocument(bodyContent: string): Document {
  const dom = new JSDOM(
    `<!doctype html>
      <html lang="en">
        <head>
          <link rel="stylesheet" href="https://substackcdn.com/bundle/theme/main.css">
          <meta property="og:title" content="Example post">
        </head>
        <body>
          <h1 class="post-title">Example post</h1>
          <div class="body markup">${bodyContent}</div>
        </body>
      </html>`,
    { url: SUBSTACK_URL }
  );

  return dom.window.document as unknown as Document;
}

function createContext(): ContentProcessorContext {
  return { pageUrl: SUBSTACK_URL, url: new URL(SUBSTACK_URL) };
}

test("registry selects Substack before the general fallback on custom domains", () => {
  const doc = createSubstackDocument("<p>" + "Readable post content. ".repeat(20) + "</p>");
  const processor = selectContentProcessor(doc, createContext());

  expect(processor.id).toBe("substack");
  expect(processor.isReadable(doc, createContext())).toBe(true);
});

test("registry uses the general processor for non-Substack pages", () => {
  const dom = new JSDOM(
    "<!doctype html><html><body><article>Generic article</article></body></html>",
    {
      url: "https://example.com/article",
    }
  );
  const doc = dom.window.document as unknown as Document;
  const context = {
    pageUrl: "https://example.com/article",
    url: new URL("https://example.com/article"),
  };

  expect(selectContentProcessor(doc, context).id).toBe("general");
});

test("Substack processor separates images, footnotes, and ordinary links", async () => {
  const doc = createSubstackDocument(`
    <figure>
      <a class="image-link" href="https://substackcdn.com/image/fetch/photo">
        <img src="https://substackcdn.com/image/fetch/photo" alt="Example">
      </a>
      <figcaption>Example image</figcaption>
    </figure>
    <p>
      A claim<a class="footnote-anchor" id="footnote-anchor-1" href="#footnote-1">1</a>
      with an <a href="https://example.com/source">external source</a>.
    </p>
    <div class="subscription-widget-wrap">
      <div class="subscription-widget"><p>Publication subscribe prompt</p></div>
    </div>
    <div class="footnote">
      <a class="footnote-number" id="footnote-1" href="#footnote-anchor-1">1</a>
      <div class="footnote-content">The separate footnote body.</div>
    </div>
  `);
  const processor = selectContentProcessor(doc, createContext());
  const article = await processor.extract(doc, createContext());

  expect(article).not.toBeNull();

  const container = doc.createElement("div");
  container.innerHTML = article?.content ?? "";
  await processor.normalizeContent(container, createContext());

  expect(container.querySelector("figure img")).not.toBeNull();
  expect(container.querySelector("figure a")).toBeNull();
  expect(container.textContent).not.toContain("Publication subscribe prompt");
  expect(container.querySelector(".pageprint-footnote-ref")?.textContent).toBe("1");
  expect(container.querySelector('a[href^="#footnote-"]')).toBeNull();
  expect(container.querySelector(".pageprint-footnotes h2")?.textContent).toBe("Footnotes");
  expect(container.querySelector(".pageprint-footnote")?.textContent).toBe(
    "The separate footnote body."
  );
  expect(container.querySelector('a[href="https://example.com/source"]')?.textContent).toBe(
    "external source"
  );
});

test("footnote normalization is a no-op for general content", () => {
  const dom = new JSDOM("<article><p>No Substack footnotes here.</p></article>");
  const container = dom.window.document.querySelector("article") as unknown as HTMLElement;

  normalizeSubstackFootnotes(container);

  expect(container.querySelector(".pageprint-footnotes")).toBeNull();
});
