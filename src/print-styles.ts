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
        text-decoration: underline;
      }

      .link-references {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #ccc;
        break-before: auto;
      }

      .link-references h2 {
        font-size: 1.1rem;
        margin-bottom: 0.75rem;
      }

      .link-reference-item {
        margin: 0.35rem 0;
        font-size: 0.85rem;
        word-break: break-all;
      }

      .link-reference-id {
        font-weight: bold;
        margin-right: 0.5rem;
      }

      .pageprint-footnote-ref {
        vertical-align: super;
        font-size: 0.72em;
        line-height: 0;
        margin-left: 0.08em;
      }

      .pageprint-footnotes {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #ccc;
      }

      .pageprint-footnotes h2 {
        font-size: 1.1rem;
        margin-bottom: 0.75rem;
      }

      .pageprint-footnotes ol {
        break-inside: auto;
        padding-left: 1.4rem;
      }

      .pageprint-footnote {
        break-inside: avoid;
        margin: 0 0 0.6rem 0;
        padding-left: 0.2rem;
        font-size: 0.9em;
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

  public static createEditorHTML(
    content: ExtractedContent,
    options: PDFOptions = {},
    editorScriptUrl: string
  ): string {
    const showByline = options.showByline ?? true;
    const showExcerpt = options.showExcerpt ?? true;

    const config = JSON.stringify({
      columns: options.columns ?? 2,
      fontSize: options.fontSize ?? 11,
      verticalMargin: options.verticalMargin ?? 0.5,
      horizontalMargin: options.horizontalMargin ?? 0.5,
      pageSize: options.pageSize ?? "Letter",
      linkHandling: options.linkHandling ?? "references",
      printCSS: this.getTailwindPrintStyles(options),
      title: content.title,
      excerpt: showExcerpt && content.excerpt ? content.excerpt : "",
      byline: showByline && content.byline ? content.byline : "",
      lang: content.lang,
      dir: content.dir,
    });

    return `<!DOCTYPE html>
<html lang="${content.lang}" dir="${content.dir}">
<head>
  <meta charset="UTF-8">
  <title>Edit — ${content.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      background: #e8e8e8;
    }

    body {
      font-family: "Söhne", "Helvetica Neue", sans-serif;
      color: #1a1a1a;
      line-height: 1.5;
    }

    .editor-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      width: 100%;
      border-bottom: 2px solid #000;
    }

    .editor-toolbar button {
      flex: 1;
      padding: 14px 0;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border: none;
      cursor: pointer;
      font-family: "Söhne", "Helvetica Neue", sans-serif;
      transition: opacity 0.1s;
    }

    .editor-toolbar button:active {
      opacity: 0.7;
    }

    .btn-revert {
      background: #fff;
      color: #000;
      border-right: 1px solid #000;
    }

    .btn-revert:hover {
      background: #f0f0f0;
    }

    .btn-print {
      background: #000;
      color: #fff;
      border-left: 1px solid #000;
    }

    .btn-print:hover {
      background: #222;
    }

    .editor-body {
      max-width: 680px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 4rem;
    }

    .editor-header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #ccc;
    }

    .editor-title {
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 0.5rem;
    }

    .editor-byline, .editor-excerpt {
      font-size: 0.9rem;
      color: #666;
      margin-top: 0.4rem;
    }

    .editor-excerpt {
      font-style: italic;
    }

    .editor-hint {
      font-size: 12px;
      color: #888;
      text-align: center;
      margin-bottom: 1.5rem;
      letter-spacing: 0.02em;
    }

    .readable-content p,
    .readable-content h1,
    .readable-content h2,
    .readable-content h3,
    .readable-content h4,
    .readable-content h5,
    .readable-content h6,
    .readable-content figure,
    .readable-content img,
    .readable-content blockquote,
    .readable-content pre,
    .readable-content table,
    .readable-content ul,
    .readable-content ol,
    .readable-content hr {
      position: relative;
      cursor: pointer;
      padding: 4px 8px;
      margin-left: -8px;
      margin-right: -8px;
      border: 1px solid transparent;
      border-radius: 2px;
      transition: border-color 0.1s, background 0.1s, opacity 0.15s;
    }

    .readable-content p:hover,
    .readable-content h1:hover,
    .readable-content h2:hover,
    .readable-content h3:hover,
    .readable-content h4:hover,
    .readable-content h5:hover,
    .readable-content h6:hover,
    .readable-content figure:hover,
    .readable-content img:hover,
    .readable-content blockquote:hover,
    .readable-content pre:hover,
    .readable-content table:hover,
    .readable-content ul:hover,
    .readable-content ol:hover,
    .readable-content hr:hover {
      border-color: #ccc;
      background: rgba(0,0,0,0.02);
    }

    .readable-content .excluded {
      opacity: 0.25;
      text-decoration: line-through;
      border-color: #e44;
      background: rgba(228,68,68,0.04);
    }

    .readable-content .excluded:hover {
      opacity: 0.45;
      border-color: #c33;
      background: rgba(228,68,68,0.08);
    }

    .readable-content h1, .readable-content h2, .readable-content h3,
    .readable-content h4, .readable-content h5, .readable-content h6 {
      font-weight: 700;
      margin-top: 1.2rem;
      margin-bottom: 0.4rem;
    }
    .readable-content h1 { font-size: 1.4rem; }
    .readable-content h2 { font-size: 1.25rem; }
    .readable-content h3 { font-size: 1.1rem; }

    .readable-content p {
      margin-bottom: 0.6rem;
    }

    .readable-content img {
      max-width: 100%;
      height: auto;
      margin: 0.5rem 0;
    }

    .readable-content figure {
      margin: 1rem 0;
      text-align: center;
    }

    .readable-content figcaption {
      font-size: 0.8rem;
      color: #888;
      margin-top: 0.25rem;
    }

    .readable-content blockquote {
      padding-left: 1rem;
      border-left: 3px solid #ccc;
      font-style: italic;
      margin: 0.8rem 0;
    }

    .readable-content ul, .readable-content ol {
      padding-left: 1.5rem;
      margin: 0.5rem 0;
    }

    .readable-content li {
      margin: 0.25rem 0;
    }

    .readable-content a {
      color: #1a6baa;
      text-decoration: underline;
    }

    .readable-content code {
      font-family: "Courier New", monospace;
      font-size: 0.88em;
      background: #f0f0f0;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }

    .readable-content pre {
      background: #f0f0f0;
      padding: 0.8rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.85rem;
    }

    .readable-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }

    .readable-content th, .readable-content td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }

    .readable-content th {
      background: #f5f5f5;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="editor-toolbar">
    <button class="btn-revert">Revert</button>
    <button class="btn-print">Print</button>
  </div>

  <div class="editor-body">
    <header class="editor-header">
      <h1 class="editor-title">${content.title}</h1>
      ${showExcerpt && content.excerpt ? `<p class="editor-excerpt">${content.excerpt}</p>` : ""}
      ${showByline && content.byline ? `<p class="editor-byline">By ${content.byline}</p>` : ""}
    </header>
    <p class="editor-hint">Click any element to exclude it from the print output</p>
    <article class="readable-content">
      ${content.content}
    </article>
  </div>

  <script type="application/json" id="pageprint-config">${config}</script>
  <script src="${editorScriptUrl}"></script>
</body>
</html>`;
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
