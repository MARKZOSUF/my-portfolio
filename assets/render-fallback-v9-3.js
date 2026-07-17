
(() => {
  "use strict";

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

  if (!window.marked) {
    window.marked = {
      setOptions() {},
      parse(source = "") {
        const blocks = [];
        let text = String(source).replace(/```([\w+-]*)\n([\s\S]*?)```/g, (_, language, code) => {
          const token = `@@CODE_${blocks.length}@@`;
          blocks.push(`<pre><code class="language-${escapeHtml(language || "text")}">${escapeHtml(code)}</code></pre>`);
          return token;
        });

        text = escapeHtml(text)
          .replace(/^### (.+)$/gm, "<h3>$1</h3>")
          .replace(/^## (.+)$/gm, "<h2>$1</h2>")
          .replace(/^# (.+)$/gm, "<h1>$1</h1>")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/`([^`\n]+)`/g, "<code>$1</code>")
          .replace(/^\s*[-*]\s+(.+)$/gm, "<div>• $1</div>")
          .replace(/\n/g, "<br>");

        blocks.forEach((block, index) => {
          text = text.replace(`@@CODE_${index}@@`, block);
        });
        return text;
      }
    };
  }

  if (!window.DOMPurify) {
    window.DOMPurify = {
      sanitize(html = "") {
        const template = document.createElement("template");
        template.innerHTML = String(html);
        template.content.querySelectorAll("script,iframe,object,embed,link,meta").forEach(node => node.remove());
        template.content.querySelectorAll("*").forEach(node => {
          [...node.attributes].forEach(attribute => {
            const name = attribute.name.toLowerCase();
            const value = attribute.value.trim().toLowerCase();
            if (name.startsWith("on") || (["href", "src"].includes(name) && value.startsWith("javascript:"))) {
              node.removeAttribute(attribute.name);
            }
          });
        });
        return template.innerHTML;
      }
    };
  }

  if (!window.hljs) {
    window.hljs = {
      highlightElement() {}
    };
  }
})();
