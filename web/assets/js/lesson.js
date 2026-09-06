/* Lesson reader: section tabs, outline, regeneration, tutor chat, export. */
import { getLesson, putLesson } from './store.js';
import { renderMarkdown, renderInto, loadKatex } from './render.js';
import { regenerateSection, addSection, lessonToMarkdown, jsonSectionToMarkdown, ALL_SECTION_IDS } from './generate.js';
import { SECTION_BY_ID, TUTOR_SYSTEM } from './prompts.js';
import { getConfig, probeServer } from './config.js';
import { chat } from './ai.js';
import { renderQuiz } from './quiz.js';
import { renderFlashcards } from './flashcards.js';
import {
  $, $$, toast, banner, clearBanners, openModal, closeModal, wireModals,
  initTheme, toggleTheme, timeAgo, downloadBlob, safeFilename,
} from './ui.js';

initTheme('dark');
wireModals();
loadKatex();

const params = new URLSearchParams(location.search);
const lessonId = params.get('id');
let lesson = null;
let activeTab = params.get('tab') || '';
const chatHistory = [];

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/* ---------------- boot ---------------- */

(async function boot() {
  if (!lessonId) {
    location.replace('./app.html');
    return;
  }
  lesson = await getLesson(lessonId);
  if (!lesson) {
    $('#lessonTitle').textContent = 'Lesson not found';
    $('#pane').innerHTML =
      '<div class="empty"><strong>This lesson is no longer stored in this browser</strong>Notes are saved locally, so they do not follow you between devices unless you restore a backup.</div>';
    return;
  }

  lesson.openedAt = Date.now();
  await putLesson(lesson);

  // Detect the site's shared AI key so the tutor and regenerate work with no setup.
  probeServer();

  const tabs = buildTabs();
  if (!tabs.some((t) => t.id === activeTab)) activeTab = tabs[0]?.id || 'all';
  renderHead();
  renderTabs(tabs);
  renderPane();
})();

/* ---------------- head ---------------- */

function renderHead() {
  document.title = `${lesson.title} — StudyForge AI`;
  $('#lessonTitle').textContent = `${lesson.emoji || '📚'} ${lesson.title}`;
  const bits = [
    lesson.plan?.subject,
    lesson.plan?.level,
    `${lesson.sections.length} sections`,
    lesson.sourceLabel ? `Source: ${lesson.sourceLabel}` : '',
    lesson.config?.model ? `${lesson.config.model}` : '',
    `Updated ${timeAgo(lesson.updatedAt || lesson.createdAt)}`,
  ].filter(Boolean);
  $('#lessonMeta').textContent = bits.join(' · ');

  clearBanners('#banners');
  if (lesson.failedSections?.length) {
    banner('#banners', {
      kind: 'warn',
      title: `${lesson.failedSections.length} section(s) did not generate`,
      body: 'Open the section and press Regenerate — usually a rate limit or a timeout.',
    });
  }
}

/* ---------------- tabs ---------------- */

function buildTabs() {
  const tabs = lesson.sections.map((section) => ({
    id: section.id,
    label: `${section.icon || '•'} ${section.title}`,
  }));
  tabs.unshift({ id: 'all', label: '📖 Full notes' });
  tabs.push({ id: 'tutor', label: '💬 Ask the tutor' });
  if (lesson.sources?.length) tabs.push({ id: 'sources', label: '🔗 Sources' });
  return tabs;
}

function renderTabs(tabs) {
  const host = $('#tabs');
  host.innerHTML = tabs
    .map(
      (tab) =>
        `<button class="tab ${tab.id === activeTab ? 'active' : ''}" role="tab" aria-selected="${tab.id === activeTab}" data-tab="${esc(tab.id)}" type="button">${esc(tab.label)}</button>`
    )
    .join('');
  $$('[data-tab]', host).forEach((btn) =>
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderTabs(tabs);
      renderPane();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
  );

  const side = $('#sideTabs');
  side.innerHTML = tabs
    .map(
      (tab) =>
        `<button class="side-link ${tab.id === activeTab ? 'active' : ''}" data-sidetab="${esc(tab.id)}" type="button">${esc(tab.label)}</button>`
    )
    .join('');
  $$('[data-sidetab]', side).forEach((btn) =>
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.sidetab;
      renderTabs(tabs);
      renderPane();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
  );
}

/* ---------------- outline ---------------- */

function renderOutline(headings) {
  const host = $('#outline');
  if (!headings?.length) {
    host.innerHTML = '<p style="color:var(--muted);font-size:13.5px;margin:0">No headings in this view.</p>';
    return;
  }
  host.innerHTML = headings
    .filter((h) => h.level <= 3)
    .map(
      (h) =>
        `<a href="#${esc(h.id)}" style="padding-left:${(h.level - 1) * 10 + 10}px">${esc(h.text)}</a>`
    )
    .join('');
}

/* ---------------- panes ---------------- */

function sectionMarkdown(section) {
  if (section.kind === 'json') return jsonSectionToMarkdown(section);
  return section.markdown || '';
}

function renderPane() {
  const pane = $('#pane');
  pane.innerHTML = '';

  if (activeTab === 'tutor') {
    renderOutline([]);
    renderTutor(pane);
    return;
  }

  if (activeTab === 'sources') {
    renderOutline([]);
    const md = ['## Reference sources', '']
      .concat(
        lesson.sources.map(
          (source, i) => `${i + 1}. [${source.title}](${source.url}) — *${source.provider}*`
        )
      )
      .join('\n');
    const doc = document.createElement('div');
    doc.className = 'doc';
    pane.appendChild(doc);
    renderInto(doc, md);
    return;
  }

  if (activeTab === 'all') {
    const doc = document.createElement('div');
    doc.className = 'doc';
    pane.appendChild(doc);
    const { headings } = renderInto(doc, lessonToMarkdown(lesson));
    renderOutline(headings);
    return;
  }

  const section = lesson.sections.find((s) => s.id === activeTab);
  if (!section) {
    pane.innerHTML = '<div class="empty"><strong>Section not found</strong>Pick another tab.</div>';
    return;
  }

  const block = document.createElement('section');
  block.className = 'section-block';

  const tools = document.createElement('div');
  tools.className = 'section-tools';
  const regen = document.createElement('button');
  regen.type = 'button';
  regen.className = 'btn btn-quiet btn-sm';
  regen.textContent = '↻ Regenerate';
  regen.addEventListener('click', () => doRegenerate(section.id, regen));
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-quiet btn-sm';
  copy.textContent = '⧉ Copy';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(sectionMarkdown(section));
      toast('Section copied as Markdown');
    } catch {
      toast('Clipboard blocked by the browser', 'error');
    }
  });
  tools.append(copy, regen);
  block.appendChild(tools);

  if (section.failed) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML = `<strong>This section failed to generate</strong>${esc(section.error || 'Press Regenerate to try again.')}`;
    block.appendChild(empty);
    pane.appendChild(block);
    renderOutline([]);
    return;
  }

  if (section.id === 'quiz' && section.kind === 'json') {
    const wrap = document.createElement('div');
    block.appendChild(wrap);
    pane.appendChild(block);
    renderQuiz(wrap, section.data);
    renderOutline([]);
    return;
  }

  if (section.id === 'flashcards' && section.kind === 'json') {
    const wrap = document.createElement('div');
    block.appendChild(wrap);
    pane.appendChild(block);
    renderFlashcards(wrap, section.data, { lessonId: lesson.id });
    renderOutline([]);
    return;
  }

  const doc = document.createElement('div');
  doc.className = 'doc';
  block.appendChild(doc);
  pane.appendChild(block);
  const { headings } = renderInto(doc, sectionMarkdown(section));
  renderOutline(headings);
}

/* ---------------- regenerate / add ---------------- */

async function doRegenerate(sectionId, button) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = '↻ Working…';
  try {
    lesson = await regenerateSection(lesson, sectionId, {
      onEvent: (e) => {
        if (e.type === 'warn') toast(e.message);
      },
    });
    renderHead();
    renderPane();
    toast('Section regenerated');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
}

$('#btnAddSection').addEventListener('click', () => {
  const present = new Set(lesson.sections.map((s) => s.id));
  const missing = ALL_SECTION_IDS.filter((id) => !present.has(id));
  const host = $('#addChecks');
  if (!missing.length) {
    host.innerHTML = '<p style="color:var(--muted);margin:0">Every available section is already in this lesson.</p>';
  } else {
    host.innerHTML = missing
      .map((id) => {
        const meta = SECTION_BY_ID[id];
        return `<label class="check"><input type="checkbox" value="${esc(id)}"><span>${esc(meta.icon)} ${esc(meta.title)}</span></label>`;
      })
      .join('');
  }
  openModal('#addModal');
});

$('#btnAddCancel').addEventListener('click', () => closeModal('#addModal'));

$('#btnAddGo').addEventListener('click', async (event) => {
  const ids = $$('#addChecks input:checked').map((i) => i.value);
  if (!ids.length) {
    toast('Pick at least one section', 'error');
    return;
  }
  const button = event.target;
  button.disabled = true;
  button.textContent = 'Generating…';
  try {
    for (const id of ids) {
      lesson = await addSection(lesson, id, {
        onEvent: (e) => {
          if (e.type === 'warn') toast(e.message);
        },
      });
    }
    closeModal('#addModal');
    activeTab = ids[0];
    renderHead();
    renderTabs(buildTabs());
    renderPane();
    toast(`${ids.length} section(s) added`);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Generate';
  }
});

/* ---------------- tutor chat ---------------- */

function renderTutor(pane) {
  const wrap = document.createElement('div');
  wrap.className = 'chat';
  wrap.innerHTML = `
    <div class="chat-log" id="chatLog"></div>
    <form class="chat-form" id="chatForm">
      <label class="sr-only" for="chatInput">Ask about this lesson</label>
      <input id="chatInput" placeholder="Ask anything about this lesson — e.g. &ldquo;derive Eₙ again, slower&rdquo;" autocomplete="off">
      <button class="btn" type="submit">Ask</button>
    </form>`;
  pane.appendChild(wrap);

  const log = $('#chatLog', wrap);

  const paint = () => {
    log.innerHTML = '';
    if (!chatHistory.length) {
      const hello = document.createElement('div');
      hello.className = 'msg ai';
      renderInto(hello, `Ask me anything about **${lesson.title}**. I only use this lesson's notes, so answers stay on syllabus. Try:\n\n- Explain step 4 of the derivation again\n- Give me two more numericals like the second one\n- What is the difference between phase and group velocity?`);
      log.appendChild(hello);
    }
    chatHistory.forEach((msg) => {
      const el = document.createElement('div');
      el.className = `msg ${msg.role === 'user' ? 'user' : 'ai'}`;
      if (msg.role === 'user') el.textContent = msg.content;
      else renderInto(el, msg.content);
      log.appendChild(el);
    });
    log.scrollTop = log.scrollHeight;
  };
  paint();

  $('#chatForm', wrap).addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = $('#chatInput', wrap);
    const question = input.value.trim();
    if (!question) return;

    let cfg = getConfig();
    if (!cfg.isConfigured) {
      await probeServer();
      cfg = getConfig();
    }
    if (!cfg.isConfigured) {
      toast('Add your API key on the dashboard first', 'error');
      return;
    }

    chatHistory.push({ role: 'user', content: question });
    input.value = '';
    paint();

    const pending = document.createElement('div');
    pending.className = 'msg ai';
    pending.innerHTML = '<span class="spin"></span> Thinking…';
    log.appendChild(pending);
    log.scrollTop = log.scrollHeight;

    try {
      const notes = lessonToMarkdown(lesson).slice(0, 30000);
      const { text } = await chat(
        [
          { role: 'system', content: TUTOR_SYSTEM },
          { role: 'system', content: `LESSON NOTES (your only source of truth):\n\n${notes}` },
          ...chatHistory.slice(-8),
        ],
        { maxTokens: 1600 }
      );
      chatHistory.push({ role: 'assistant', content: text });
      paint();
    } catch (err) {
      pending.remove();
      toast(err.message, 'error');
      chatHistory.pop();
      paint();
    }
  });
}

/* ---------------- export ---------------- */

$('#btnExportMd').addEventListener('click', () => {
  downloadBlob(`${safeFilename(lesson.title)}.md`, lessonToMarkdown(lesson), 'text/markdown;charset=utf-8');
  toast('Markdown exported');
});

$('#btnPrint').addEventListener('click', () => {
  const previous = activeTab;
  activeTab = 'all';
  renderTabs(buildTabs());
  renderPane();
  setTimeout(() => {
    window.print();
    activeTab = previous;
    renderTabs(buildTabs());
    renderPane();
  }, 400);
});

$('#navTheme').addEventListener('click', () => toggleTheme());

/* Outline highlighting */
window.addEventListener('scroll', () => {
  const links = $$('#outline a');
  if (!links.length) return;
  let current = null;
  links.forEach((link) => {
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (target && target.getBoundingClientRect().top <= 120) current = link;
  });
  links.forEach((link) => link.classList.toggle('active', link === current));
}, { passive: true });
