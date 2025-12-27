import type { ExtractedContent, PDFOptions } from "./types";

export class PrintStyles {
  public static getTailwindPrintStyles(options: PDFOptions = {}): string {
    const columns = options.columns ?? 2;
    const fontSize = options.fontSize ?? 10;
    const verticalMargin = options.verticalMargin ?? 0.5;
    const horizontalMargin = options.horizontalMargin ?? 0.5;
    const pageSize = options.pageSize ?? "Letter";

    const pageDimensions =
      pageSize === "A4" ? { width: "210mm", height: "297mm" } : { width: "8.5in", height: "11in" };

    return `
      @page {
        size: ${pageDimensions.width} ${pageDimensions.height};
        margin-top: ${verticalMargin}in;
        margin-bottom: ${verticalMargin}in;
        margin-left: ${horizontalMargin}in;
        margin-right: ${horizontalMargin}in;
      }

      * {
        box-sizing: border-box;
      }

      html {
        line-height: 1.35;
      }

      body {
        font-family: "Times New Roman", "Linux Libertine", serif;
        font-size: ${fontSize}pt !important;
        margin: 0;
        padding: 0;
        background: white !important;
        color: black !important;
        hyphens: auto;
        word-wrap: break-word;
      }

      .print-container {
        max-width: 100%;
        margin: 0 auto;
      }

      .print-header {
        text-align: center;
        margin-bottom: 2rem;
        break-inside: avoid;
      }

      .print-title {
        font-size: 0.8rem;
        font-weight: bold;
        margin: 0 0 0.5rem 0;
        break-after: avoid;
      }

      .print-byline, .print-site {
        font-size: 0.9rem;
        color: #666;
        margin: 0.25rem 0;
      }

      .print-excerpt {
        font-size: 0.95rem;
        color: #555;
        font-style: italic;
        margin: 0.75rem 0;
        line-height: 1.4;
      }

      .print-content {
        column-count: ${columns};
        column-gap: 1.2em;
        column-fill: auto;
      }

      .readable-content {
        width: 100%;
      }

      h1, h2, h3, h4, h5, h6 {
        break-after: avoid;
        break-inside: avoid;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        font-weight: bold;
      }

      h1 { font-size: 1.3rem; }
      h2 { font-size: 1.2rem; }
      h3 { font-size: 1.1rem; }
      h4, h5, h6 { font-size: 1rem; }

      p {
        margin: 0 0 0.5rem 0;
        orphans: 2;
        widows: 2;
      }

      img {
        max-width: 100%;
        height: auto;
        break-inside: avoid;
        margin: 0.5rem 0;
      }

      figure {
        break-inside: avoid;
        margin: 1rem 0;
        text-align: center;
      }

      figcaption {
        font-size: 0.8rem;
        color: #666;
        margin-top: 0.25rem;
      }

      blockquote {
        margin: 1rem 0;
        padding-left: 1rem;
        border-left: 2px solid #ccc;
        font-style: italic;
        break-inside: avoid;
      }

      ul, ol {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
        break-inside: avoid;
      }

      li {
        margin: 0.25rem 0;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      code {
        font-family: "Courier New", monospace;
        font-size: 0.9em;
        background: #f5f5f5;
        padding: 0.1rem 0.2rem;
        border-radius: 2px;
      }

      pre {
        background: #f5f5f5;
        padding: 0.5rem;
        border-radius: 4px;
        overflow-x: auto;
        break-inside: avoid;
        font-size: 0.85rem;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
        break-inside: avoid;
      }

      th, td {
        border: 1px solid #ddd;
        padding: 0.5rem;
        text-align: left;
      }

      th {
        background: #f5f5f5;
        font-weight: bold;
      }

      video, audio, iframe, embed, object {
        display: none !important;
      }

      @media print {
        .print-content {
          column-count: ${columns};
        }
      }

      @media screen and (max-width: 768px) {
        .print-content {
          column-count: 1;
        }
      }
    `;
  }

  public static createPrintableHTML(content: ExtractedContent, options: PDFOptions = {}): string {
    const showByline = options.showByline ?? true;
    const showExcerpt = options.showExcerpt ?? true;

    return `<!DOCTYPE html>
<html lang="${content.lang}" dir="${content.dir}">
<head>
  <meta charset="UTF-8">
  <title>${content.title}</title>
  <style>
    ${this.getTailwindPrintStyles(options)}
  </style>
</head>
<body>
  <div class="print-container">
    <header class="print-header">
      <h1 class="print-title">${content.title}</h1>
      ${showExcerpt && content.excerpt ? `<p class="print-excerpt">${content.excerpt}</p>` : ""}
      ${showByline && content.byline ? `<p class="print-byline">By ${content.byline}</p>` : ""}
    </header>
    <main class="print-content">
      <article class="readable-content">
        ${content.content}
      </article>
    </main>
  </div>
</body>
</html>`;
  }
}
