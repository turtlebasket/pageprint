import { expect, test } from "bun:test";
import { processImagesForStandaloneDocument } from "../src/image-inliner";

const ARTICLE_URL = "https://example.com/articles/story";

class FakeElement {
  public removed = false;
  public parentElement: FakeElement | null = null;
  private readonly attributes = new Map<string, string>();
  private readonly children: FakeElement[] = [];

  public constructor(
    public readonly tagName: string,
    attributes: Record<string, string> = {}
  ) {
    Object.entries(attributes).forEach(([name, value]) => {
      this.attributes.set(name, value);
    });
  }

  public appendChild(child: FakeElement): void {
    child.parentElement = this;
    this.children.push(child);
  }

  public getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  public removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  public hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  public remove(): void {
    this.removed = true;
  }

  public closest(selector: string): FakeElement | null {
    let element: FakeElement | null = this;

    while (element !== null) {
      if (element.matches(selector)) {
        return element;
      }

      element = element.parentElement;
    }

    return null;
  }

  public querySelectorAll(selector: string): FakeElement[] {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) && !child.removed ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }

  private matches(selector: string): boolean {
    if (selector === "img") {
      return this.tagName === "IMG";
    }

    if (selector === "picture") {
      return this.tagName === "PICTURE";
    }

    if (selector === "source") {
      return this.tagName === "SOURCE";
    }

    if (selector === "a[href]") {
      return this.tagName === "A" && this.hasAttribute("href");
    }

    return false;
  }
}

class FakeImage extends FakeElement {
  public constructor(attributes: Record<string, string>) {
    super("IMG", attributes);
  }
}

class FakeSource extends FakeElement {
  public constructor(attributes: Record<string, string>) {
    super("SOURCE", attributes);
  }
}

class FakeContainer extends FakeElement {
  public constructor(children: FakeElement[]) {
    super("DIV");
    children.forEach((child) => this.appendChild(child));
  }
}

function createPicture(...children: FakeElement[]): FakeElement {
  const picture = new FakeElement("PICTURE");
  children.forEach((child) => picture.appendChild(child));
  return picture;
}

function createAnchor(attributes: Record<string, string>, ...children: FakeElement[]): FakeElement {
  const anchor = new FakeElement("A", attributes);
  children.forEach((child) => anchor.appendChild(child));
  return anchor;
}

function createContainer(...children: FakeElement[]): HTMLElement {
  return new FakeContainer(children) as unknown as HTMLElement;
}

test("inlines the best srcset candidate and removes external candidates", async () => {
  const img = new FakeImage({
    sizes: "100vw",
    src: "/images/photo.jpg",
    srcset: "/images/photo-small.jpg 400w, /images/photo-large.jpg 1200w",
  });
  const container = createContainer(img);
  const requestedUrls: string[] = [];

  await processImagesForStandaloneDocument(container, ARTICLE_URL, async (url) => {
    requestedUrls.push(url);
    return "data:image/jpeg;base64,embedded";
  });

  expect(requestedUrls).toEqual(["https://example.com/images/photo-large.jpg"]);
  expect(img.getAttribute("src")).toBe("data:image/jpeg;base64,embedded");
  expect(img.hasAttribute("srcset")).toBe(false);
  expect(img.hasAttribute("sizes")).toBe(false);
});

test("normalizes image URLs when an image cannot be inlined", async () => {
  const img = new FakeImage({
    "data-src": "/images/lazy.jpg",
    src: "../images/photo.jpg",
    srcset: "../images/photo-small.jpg 1x, ../images/photo-large.jpg 2x",
  });
  const container = createContainer(img);

  await processImagesForStandaloneDocument(container, ARTICLE_URL, async () => null);

  expect(img.getAttribute("src")).toBe("https://example.com/images/photo.jpg");
  expect(img.hasAttribute("srcset")).toBe(false);
  expect(img.hasAttribute("data-src")).toBe(false);
});

test("prefers lazy sources over placeholder images", async () => {
  const img = new FakeImage({
    "data-src": "/images/real.webp",
    src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  });
  const container = createContainer(img);
  const requestedUrls: string[] = [];

  await processImagesForStandaloneDocument(container, ARTICLE_URL, async (url) => {
    requestedUrls.push(url);
    return "data:image/webp;base64,embedded";
  });

  expect(requestedUrls).toEqual(["https://example.com/images/real.webp"]);
  expect(img.getAttribute("src")).toBe("data:image/webp;base64,embedded");
  expect(img.hasAttribute("data-src")).toBe(false);
});

test("does not let placeholder srcset override a lazy source", async () => {
  const img = new FakeImage({
    "data-src": "/images/real.webp",
    src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    srcset: "/images/placeholder-small.gif 1x, /images/placeholder-large.gif 2x",
  });
  const container = createContainer(img);
  const requestedUrls: string[] = [];

  await processImagesForStandaloneDocument(container, ARTICLE_URL, async (url) => {
    requestedUrls.push(url);
    return "data:image/webp;base64,embedded";
  });

  expect(requestedUrls).toEqual(["https://example.com/images/real.webp"]);
  expect(img.getAttribute("src")).toBe("data:image/webp;base64,embedded");
  expect(img.hasAttribute("srcset")).toBe(false);
});

test("prefers live currentSrc copied from the original page", async () => {
  const img = new FakeImage({
    "data-pageprint-current-src": "https://cdn.example.com/rendered.webp",
    src: "/images/broken-placeholder.jpg",
  });
  const container = createContainer(img);
  const requestedUrls: string[] = [];

  await processImagesForStandaloneDocument(container, ARTICLE_URL, async (url) => {
    requestedUrls.push(url);
    return "data:image/webp;base64,embedded";
  });

  expect(requestedUrls).toEqual(["https://cdn.example.com/rendered.webp"]);
  expect(img.getAttribute("src")).toBe("data:image/webp;base64,embedded");
  expect(img.hasAttribute("data-pageprint-current-src")).toBe(false);
});

test("uses picture source candidates for linked images with empty img fallback", async () => {
  const img = new FakeImage({ alt: "Linked image" });
  const source = new FakeSource({
    srcset: "/images/picture-small.webp 400w, /images/picture-large.webp 1200w",
  });
  const picture = createPicture(source, img);
  const anchor = createAnchor({ href: "https://example.com/gallery" }, picture);
  const container = createContainer(anchor);
  const requestedUrls: string[] = [];

  await processImagesForStandaloneDocument(container, ARTICLE_URL, async (url) => {
    requestedUrls.push(url);
    return "data:image/webp;base64,embedded";
  });

  expect(requestedUrls).toEqual(["https://example.com/images/picture-large.webp"]);
  expect(img.getAttribute("src")).toBe("data:image/webp;base64,embedded");
  expect(source.removed).toBe(true);
});

test("uses linked image href when the img has no usable source", async () => {
  const img = new FakeImage({ alt: "Linked image" });
  const anchor = createAnchor({ href: "/images/full-size.png" }, img);
  const container = createContainer(anchor);
  const requestedUrls: string[] = [];

  await processImagesForStandaloneDocument(container, ARTICLE_URL, async (url) => {
    requestedUrls.push(url);
    return "data:image/png;base64,embedded";
  });

  expect(requestedUrls).toEqual(["https://example.com/images/full-size.png"]);
  expect(img.getAttribute("src")).toBe("data:image/png;base64,embedded");
});
