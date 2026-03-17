/**
 * Editor script for the PagePrint preview/edit window.
 * Handles click-to-exclude elements and the Print/Revert actions.
 * Loaded as an external script (MV3 CSP requires no inline scripts).
 * Reads configuration from a <script type="application/json" id="pageprint-config"> element.
 */

interface EditorConfig {
  columns: number;
  fontSize: number;
  verticalMargin: number;
  horizontalMargin: number;
  pageSize: string;
  linkHandling: string;
  printCSS: string;
  title: string;
  excerpt: string;
  byline: string;
  lang: string;
  dir: string;
}

const SELECTABLE = "p, h1, h2, h3, h4, h5, h6, figure, img, blockquote, pre, table, ul, ol, hr";

function init() {
  const configEl = document.getElementById("pageprint-config");
  if (!configEl) return;

  const config: EditorConfig = JSON.parse(configEl.textContent || "{}");
  const article = document.querySelector(".readable-content");
  if (!article) return;

  // Click to toggle exclusion on block-level content elements
  article.addEventListener("click", (e: Event) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Find the closest selectable element within the article
    const el = target.closest(SELECTABLE);
    if (el && article.contains(el)) {
      el.classList.toggle("excluded");
    }
  });

  // Revert button
  const revertBtn = document.querySelector(".btn-revert");
  if (revertBtn) {
    revertBtn.addEventListener("click", () => {
      article.querySelectorAll(".excluded").forEach((el) => {
        el.classList.remove("excluded");
      });
    });
  }

  // Print button
  const printBtn = document.querySelector(".btn-print");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      doPrint(config, article);
    });
  }
}

function processLinksForPrint(doc: Document, mode: string) {
  if (mode === "embed") return;
  const article = doc.querySelector(".readable-content");
  if (!article) return;
  const anchors = article.querySelectorAll("a[href]");

  if (mode === "none") {
    anchors.forEach((a) => {
      const t = doc.createTextNode(a.textContent || "");
      a.parentNode?.replaceChild(t, a);
    });
  } else if (mode === "references") {
    const links: { id: number; url: string }[] = [];
    let counter = 0;
    anchors.forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      counter++;
      links.push({ id: counter, url: href });
      const t = doc.createTextNode(`${a.textContent || ""} [L${counter}]`);
      a.parentNode?.replaceChild(t, a);
    });
    if (links.length > 0) {
      const sec = doc.createElement("section");
      sec.className = "link-references";
      sec.innerHTML =
        "<h2>Links</h2>" +
        links
          .map(
            (l) =>
              `<div class="link-reference-item"><span class="link-reference-id">[L${l.id}]</span>${l.url}</div>`
          )
          .join("\n");
      article.appendChild(sec);
    }
  }
}

function doPrint(config: EditorConfig, article: Element) {
  const clone = article.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".excluded").forEach((el) => el.remove());

  const html =
    `<!DOCTYPE html>` +
    `<html lang="${config.lang}" dir="${config.dir}">` +
    `<head><meta charset="UTF-8"><title>${config.title}</title>` +
    `<style>${config.printCSS}</style></head>` +
    `<body><div class="print-container">` +
    `<header class="print-header">` +
    `<h1 class="print-title">${config.title}</h1>` +
    (config.excerpt ? `<p class="print-excerpt">${config.excerpt}</p>` : "") +
    (config.byline ? `<p class="print-byline">By ${config.byline}</p>` : "") +
    `</header>` +
    `<main class="print-content">` +
    `<article class="readable-content">${clone.innerHTML}</article>` +
    `</main></div></body></html>`;

  const pw = window.open("", "_blank", "width=800,height=600");
  if (!pw) {
    alert("Could not open print window — check your popup blocker.");
    return;
  }
  pw.document.write(html);
  pw.document.close();

  processLinksForPrint(pw.document, config.linkHandling);

  setTimeout(() => {
    pw.print();
    setTimeout(() => {
      if (!pw.closed) pw.close();
    }, 1000);
  }, 500);
}

init();
