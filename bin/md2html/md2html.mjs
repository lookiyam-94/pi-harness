// md2html - convert lesson markdown on stdin to Trilium text-note HTML.
//
// Trilium text notes render mermaid and math when stored in CKEditor's form:
//   ```mermaid      -> <pre spellcheck="false"><code class="language-mermaid">
//   $x$ / $$x$$     -> <span class="math-tex">\(x\)</span> / \[x\]

import { readFileSync } from "node:fs";
import { Marked } from "marked";

const escape = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const math = (tex, display) =>
  `<span class="math-tex">${display ? "\\[" : "\\("}${escape(tex.trim())}${display ? "\\]" : "\\)"}</span>`;

const marked = new Marked({
  gfm: true,
  extensions: [
    {
      name: "blockMath",
      level: "block",
      start: (src) => src.match(/^\$\$/m)?.index,
      tokenizer(src) {
        const m = /^\$\$([\s\S]+?)\$\$[^\S\n]*(?:\n|$)/.exec(src);
        if (m) return { type: "blockMath", raw: m[0], tex: m[1] };
      },
      renderer: (t) => `<p>${math(t.tex, true)}</p>\n`,
    },
    {
      name: "inlineMath",
      level: "inline",
      start: (src) => src.indexOf("$"),
      tokenizer(src) {
        const m = /^\$\$([^$]+?)\$\$/.exec(src) || /^\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/.exec(src);
        if (m) return { type: "inlineMath", raw: m[0], tex: m[1], display: m[0].startsWith("$$") };
      },
      renderer: (t) => math(t.tex, t.display),
    },
  ],
  renderer: {
    code({ text, lang }) {
      if (lang === "mermaid") {
        return `<pre spellcheck="false"><code class="language-mermaid">${escape(text)}</code></pre>\n`;
      }
      return false;
    },
  },
});

process.stdout.write(marked.parse(readFileSync(0, "utf8")));
