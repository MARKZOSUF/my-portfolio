/* Zero-dependency Markdown + math + diagram renderer.
 * Deliberately self-contained: no bundler, no npm install, no CDN required at
 * build time, so a Cloudflare Pages deploy can never fail on a dependency.
 * KaTeX, if present on the page, is used to typeset math; otherwise math is
 * shown in a readable monospace fallback.
 */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

export const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'section';

/* ---------------- math ---------------- */

function typeset(tex, displayMode) {
  const clean = String(tex || '').trim();
  if (window.katex) {
    try {
      return window.katex.renderToString(clean, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
        macros: { '\\boxed': '\\fbox{$#1$}' },
      });
    } catch {
      /* fall through to plain rendering */
    }
  }
  const tag = displayMode ? 'div' : 'span';
  return `<${tag} class="math-raw${displayMode ? ' math-block' : ''}">${escapeHtml(clean)}</${tag}>`;
}

/* ---------------- inline ---------------- */

function inline(text) {
  const slots = [];
  const hold = (html) => {
    slots.push(html);
    return `\u0000${slots.length - 1}\u0000`;
  };

  let out = String(text || '');

  // inline code first so nothing inside it is interpreted
  out = out.replace(/`([^`\n]+)`/g, (_, code) => hold(`<code>${escapeHtml(code)}</code>`));
  // inline math: $...$ and \(...\)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => hold(typeset(tex, false)));
  out = out.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_, tex) => hold(typeset(tex, false)));

  out = escapeHtml(out);

  out = out
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img alt="${alt}" src="${src}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const safe = /^(https?:|mailto:|#|\/)/i.test(href) ? href : '#';
      return `<a href="${safe}" ${safe.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
    })
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<![*\w])\*([^*\n]+)\*(?![*\w])/g, '<em>$1</em>')
    .replace(/(?<!_)__([^_]+)__(?!_)/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[\^([^\]]+)\]/g, '<sup class="cite">$1</sup>');

  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[Number(i)]);
}

/* ---------------- tables ---------------- */

const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, '|').trim());

function renderTable(lines) {
  const header = splitRow(lines[0]);
  const aligns = splitRow(lines[1]).map((spec) => {
    if (/^:-+:$/.test(spec)) return 'center';
    if (/^-+:$/.test(spec)) return 'right';
    return 'left';
  });
  const body = lines.slice(2).filter((l) => l.trim());
  const th = header
    .map((cell, i) => `<th style="text-align:${aligns[i] || 'left'}">${inline(cell)}</th>`)
    .join('');
  const rows = body
    .map((line) => {
      const cells = splitRow(line);
      const tds = header
        .map((_, i) => `<td style="text-align:${aligns[i] || 'left'}">${inline(cells[i] || '')}</td>`)
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');
  return `<div class="table-wrap"><table><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ---------------- block parser ---------------- */

export function renderMarkdown(source) {
  const lines = String(source || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const headings = [];
  let i = 0;

  const isTableStart = (n) =>
    lines[n]?.includes('|') && /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(lines[n + 1] || '') && (lines[n + 1] || '').includes('|');

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // fenced blocks
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/);
    if (fence) {
      const marker = fence[1][0];
      const len = fence[1].length;
      const lang = (fence[2] || '').toLowerCase();
      const buf = [];
      i += 1;
      while (i < lines.length && !new RegExp(`^\\s*${marker === '`' ? '`' : '~'}{${len},}\\s*$`).test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      const body = buf.join('\n');
      if (lang === 'diagram' || lang === 'figure' || lang === 'ascii') {
        out.push(
          `<figure class="diagram"><pre>${escapeHtml(body)}</pre><figcaption>Diagram — redraw this in your answer sheet with every label.</figcaption></figure>`
        );
      } else if (lang === 'math' || lang === 'latex' || lang === 'tex') {
        out.push(`<div class="math-display">${typeset(body, true)}</div>`);
      } else {
        out.push(
          `<pre class="code" data-lang="${escapeHtml(lang)}"><code>${escapeHtml(body)}</code></pre>`
        );
      }
      continue;
    }

    // display math $$ ... $$
    if (/^\s*\$\$\s*$/.test(line)) {
      const buf = [];
      i += 1;
      while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<div class="math-display">${typeset(buf.join('\n'), true)}</div>`);
      continue;
    }
    const oneLineMath = line.match(/^\s*\$\$([\s\S]+?)\$\$\s*$/);
    if (oneLineMath) {
      out.push(`<div class="math-display">${typeset(oneLineMath[1], true)}</div>`);
      i += 1;
      continue;
    }

    // headings
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const raw = heading[2].replace(/\s*#+\s*$/, '').trim();
      const id = slug(raw);
      if (level <= 3) headings.push({ level, text: raw.replace(/[*_`$]/g, ''), id });
      out.push(`<h${level} id="${id}">${inline(raw)}</h${level}>`);
      i += 1;
      continue;
    }

    // horizontal rule
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
      out.push('<hr>');
      i += 1;
      continue;
    }

    // table
    if (isTableStart(i)) {
      const buf = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        buf.push(lines[i]);
        i += 1;
      }
      out.push(renderTable(buf));
      continue;
    }

    // blockquote
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      const inner = renderMarkdown(buf.join('\n'));
      out.push(`<blockquote class="callout">${inner.html}</blockquote>`);
      continue;
    }

    // task list
    if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*+]\s+\[[ xX]\]\s+/.test(lines[i])) {
        const m = lines[i].match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
        const checked = m[1].toLowerCase() === 'x';
        buf.push(
          `<li class="task"><input type="checkbox" ${checked ? 'checked' : ''}> <span>${inline(m[2])}</span></li>`
        );
        i += 1;
      }
      out.push(`<ul class="tasks">${buf.join('')}</ul>`);
      continue;
    }

    // lists (with one nesting level)
    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[i])) {
        const indent = (lines[i].match(/^\s*/) || [''])[0].length;
        const text = lines[i].replace(/^\s*([-*+]|\d+[.)])\s+/, '');
        const cont = [];
        i += 1;
        while (i < lines.length && lines[i].trim() && !/^\s*([-*+]|\d+[.)])\s+/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) && !/^\s*\$\$/.test(lines[i])) {
          cont.push(lines[i].trim());
          i += 1;
        }
        items.push({ indent, html: inline([text, ...cont].join(' ')) });
      }
      const base = Math.min(...items.map((it) => it.indent));
      let html = '';
      let open = false;
      for (const item of items) {
        if (item.indent > base && !open) {
          html += '<ul class="nested">';
          open = true;
        } else if (item.indent <= base && open) {
          html += '</ul>';
          open = false;
        }
        html += `<li>${item.html}</li>`;
      }
      if (open) html += '</ul>';
      out.push(ordered ? `<ol>${html}</ol>` : `<ul>${html}</ul>`);
      continue;
    }

    // paragraph
    const buf = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|\s*>|\s*[-*+]\s|\s*\d+[.)]\s|\s*(`{3,}|~{3,})|\s*\$\$)/.test(lines[i]) &&
      !isTableStart(i)
    ) {
      buf.push(lines[i].trim());
      i += 1;
    }
    if (buf.length) out.push(`<p>${inline(buf.join(' '))}</p>`);
  }

  return { html: out.join('\n'), headings };
}

/** Render into a container and return the heading outline. */
export function renderInto(el, markdown) {
  const { html, headings } = renderMarkdown(markdown);
  el.innerHTML = html;
  return headings;
}

/** Optional: pull KaTeX in lazily so math looks typeset when online. */
export function loadKatex() {
  if (window.katex || document.getElementById('katex-css')) return;
  const css = document.createElement('link');
  css.id = 'katex-css';
  css.rel = 'stylesheet';
  css.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  css.crossOrigin = 'anonymous';
  document.head.appendChild(css);
  const js = document.createElement('script');
  js.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
  js.crossOrigin = 'anonymous';
  js.defer = true;
  js.onload = () => document.dispatchEvent(new CustomEvent('katex:ready'));
  document.head.appendChild(js);
}
