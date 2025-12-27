/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,ts,svelte}", "./src/popup/**/*.{html,js,ts,svelte}"],
  theme: {
    extend: {
      typography: {
        print: {
          css: {
            "column-count": "2",
            "column-gap": "1.2em",
            "font-size": "10pt",
            "line-height": "1.35",
            orphans: "2",
            widows: "2",
            hyphens: "auto",
            "word-wrap": "break-word",
            color: "black",
            background: "white",
            "max-width": "100%",
            margin: "0",
            padding: "0",
            "@page": {
              size: "A4",
              margin: "15mm 12mm",
            },
            "h1, h2, h3, h4, h5, h6": {
              "break-after": "avoid",
              "break-inside": "avoid",
              "margin-top": "1rem",
              "margin-bottom": "0.5rem",
              "font-weight": "bold",
            },
            p: {
              margin: "0 0 0.5rem 0",
              orphans: "2",
              widows: "2",
            },
            "img, figure, blockquote, table": {
              "break-inside": "avoid",
            },
            img: {
              "max-width": "100%",
              height: "auto",
              margin: "0.5rem 0",
            },
            figure: {
              "text-align": "center",
            },
            figcaption: {
              "font-size": "0.8rem",
              color: "#666",
              "margin-top": "0.25rem",
            },
            blockquote: {
              margin: "1rem 0",
              "padding-left": "1rem",
              "border-left": "2px solid #ccc",
              "font-style": "italic",
            },
            "ul, ol": {
              margin: "0.5rem 0",
              "padding-left": "1.5rem",
            },
            li: {
              margin: "0.25rem 0",
            },
            a: {
              color: "inherit",
              "text-decoration": "none",
            },
            code: {
              "font-family": '"Courier New", monospace',
              "font-size": "0.9em",
              background: "#f5f5f5",
              padding: "0.1rem 0.2rem",
              "border-radius": "2px",
            },
            pre: {
              background: "#f5f5f5",
              padding: "0.5rem",
              "border-radius": "4px",
              "overflow-x": "auto",
              "font-size": "0.85rem",
            },
            table: {
              width: "100%",
              "border-collapse": "collapse",
              margin: "1rem 0",
            },
            "th, td": {
              border: "1px solid #ddd",
              padding: "0.5rem",
              "text-align": "left",
            },
            th: {
              background: "#f5f5f5",
              "font-weight": "bold",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
