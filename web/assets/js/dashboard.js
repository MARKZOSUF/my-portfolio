/* Dashboard controller: composer, settings, lessons list, folders, backup. */
import { getConfig, saveConfig, clearConfig, detectProvider, PROVIDERS, verifyKey, probeServer, serverReady, SERVER_ONLY } from './config.js';
import { listModels } from './ai.js';
import { SECTIONS, SECTION_BY_ID } from './prompts.js';
import { generateLesson, DEFAULT_SECTION_IDS, ALL_SECTION_IDS } from './generate.js';
import { extractFile, fetchYouTubeTranscript, parseYouTubeId, speechSupported, startDictation } from './extract.js';
import { listLessons, listFolders, putFolder, deleteFolder, deleteLesson, newId, exportAll, importAll } from './store.js';
import {
  $, $$, toast, banner, clearBanners, openModal, closeModal, wireModals,
  initTheme, toggleTheme, timeAgo, downloadBlob, setBusy,
} from './ui.js';

initTheme('dark');
wireModals();

const state = {
  source: null,            // { text, label, kind }
  sectionIds: [...DEFAULT_SECTION_IDS],
  research: false,
  dictation: null,
  generating: false,
  abort: null,
};

/* ---------------- settings ---------------- */

function refreshProviderNote() {
  const cfg = getConfig();
  const note = $('#providerNote');
  if (!note) return;
  if (cfg.usingServer) {
    note.textContent = cfg.model ? `Ready · no key needed · ${cfg.model}` : 'Ready · no key needed';
  } else if (cfg.isConfigured) {
    note.textContent = `${cfg.providerLabel} · ${cfg.model}`;
  } else {
    note.textContent = 'No API key yet';
  }
}

function refreshDetected() {
  const key = $('#apiKey').value.trim();
  const note = $('#detectedNote');
  const modelNote = $('#modelNote');
  if (!key) {
    note.textContent = '';
    if (modelNote) modelNote.textContent = '';
    return;
  }
  const name = detectProvider(key);
  const preset = PROVIDERS[name];
  if (name === 'custom') {
    note.textContent = 'Unrecognised key format — add an API base URL under Advanced.';
  } else {
    note.textContent = `Detected: ${preset.label} — default model ${preset.proModel || preset.model}`;
  }
  if (modelNote) modelNote.textContent = `Auto default for this key: ${preset.proModel || preset.model}`;
}

function loadSettingsForm() {
  const cfg = getConfig();
  renderServerStatus();
  $('#apiKey').value = cfg.apiKey || '';
  $('#examBoard').value = cfg.examBoard || '';
  $('#modelInput').value = localStorageModel() || '';
  $('#baseUrlInput').value = localStorageBaseUrl() || '';
  $('#useProxy').checked = Boolean(cfg.useServerProxy);
  $$('#segQuality button').forEach((b) => b.classList.toggle('active', b.dataset.v === cfg.quality));
  refreshDetected();
}

function localStorageModel() {
  try {
    return (JSON.parse(localStorage.getItem('studyforge.config.v1') || '{}').model) || '';
  } catch {
    return '';
  }
}
function localStorageBaseUrl() {
  try {
    return (JSON.parse(localStorage.getItem('studyforge.config.v1') || '{}').baseUrl) || '';
  } catch {
    return '';
  }
}

function saveSettingsForm() {
  const quality = $$('#segQuality button').find((b) => b.classList.contains('active'))?.dataset.v || 'deep';
  saveConfig({
    apiKey: $('#apiKey').value.trim(),
    examBoard: $('#examBoard').value.trim(),
    model: $('#modelInput').value.trim(),
    baseUrl: $('#baseUrlInput').value.trim(),
    useServerProxy: $('#useProxy').checked,
    quality,
  });
  $('#quality').value = quality;
  refreshProviderNote();
  renderKeyBanner();
  toast('Settings saved');
  closeModal('#settingsModal');
}

$('#navSettings').addEventListener('click', () => {
  loadSettingsForm();
  openModal('#settingsModal');
});
$('#apiKey').addEventListener('input', refreshDetected);
$$('#segQuality button').forEach((btn) =>
  btn.addEventListener('click', () => {
    $$('#segQuality button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  })
);
$('#btnSaveSettings').addEventListener('click', saveSettingsForm);
$('#btnClearKey').addEventListener('click', () => {
  clearConfig();
  loadSettingsForm();
  refreshProviderNote();
  renderKeyBanner();
  toast('API key removed');
});
$('#btnTestKey').addEventListener('click', async (event) => {
  saveConfig({ apiKey: $('#apiKey').value.trim(), baseUrl: $('#baseUrlInput').value.trim(), model: $('#modelInput').value.trim(), useServerProxy: $('#useProxy').checked });
  setBusy(event.target, true, 'Testing…');
  try {
    const ok = await verifyKey();
    toast(ok ? 'Key works — you are ready to generate.' : 'Key responded but not as expected. It may still work.');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy(event.target, false);
  }
});
$('#btnLoadModels').addEventListener('click', async (event) => {
  saveConfig({ apiKey: $('#apiKey').value.trim(), baseUrl: $('#baseUrlInput').value.trim() });
  setBusy(event.target, true, 'Loading…');
  try {
    const models = await listModels();
    const picker = $('#modelPicker');
    if (!models.length) {
      toast('This provider did not return a model list. Type the model name instead.');
      return;
    }
    picker.innerHTML = `<option value="">— pick a model —</option>${models
      .map((m) => `<option value="${m}">${m}</option>`)
      .join('')}`;
    picker.hidden = false;
    picker.onchange = () => {
      if (picker.value) $('#modelInput').value = picker.value;
    };
    toast(`${models.length} models available`);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    setBusy(event.target, false);
  }
});

/**
 * Owner-key mode: strip every trace of API-key setup from the UI so a visitor
 * only ever types a topic. Called once on boot.
 */
function lockToOwnerKey() {
  if (!SERVER_ONLY) return;
  ['#keyField', '#baseUrlField', '#proxyCheck', '#btnClearKey', '#btnTestKey'].forEach((sel) => {
    const el = $(sel);
    if (el) el.hidden = true;
  });
  const sub = $('.modal-sub', $('#settingsModal'));
  if (sub) sub.textContent = 'Notes are powered by this site. Nothing to set up — just pick your depth and language.';
  const note = $('#providerNote');
  if (note) note.textContent = 'Ready \u00b7 no key needed';
  clearBanners('#banners');
}

function renderServerStatus() {
  const host = $('#serverStatus');
  if (!host) return;
  if (SERVER_ONLY) {
    host.textContent = 'This site provides the AI for you. Generate as many topics as you like \u2014 no API key, no sign-up.';
    return;
  }
  const cfg = getConfig();
  if (serverReady() && cfg.usingServer) {
    host.textContent =
      'This site already has a shared AI key, so notes work with nothing to set up. Add your own key below only if you want to use your own quota.';
  } else if (serverReady()) {
    host.textContent = 'Your own key is being used. Remove it to fall back to this site\u2019s shared key.';
  } else {
    host.textContent = '';
  }
}

function renderKeyBanner() {
  clearBanners('#banners');
  const cfg = getConfig();
  if (cfg.usingServer) {
    // Shared server key is live: nothing for the visitor to configure.
    return;
  }
  if (!cfg.isConfigured) {
    banner('#banners', {
      kind: 'warn',
      title: 'Add your API key to start',
      body: 'One key runs every feature. Paste any OpenAI, Gemini, Claude, Groq, OpenRouter, DeepSeek or Mistral key — the provider and default model are detected automatically.',
      actionLabel: 'Open settings',
      onAction: () => {
        loadSettingsForm();
        openModal('#settingsModal');
      },
    });
  } else if (cfg.providerName === 'custom' && !cfg.baseUrl) {
    banner('#banners', {
      kind: 'error',
      title: 'API base URL required',
      body: 'This key format was not recognised. Add the provider base URL under Settings → Advanced.',
      actionLabel: 'Fix now',
      onAction: () => {
        loadSettingsForm();
        openModal('#settingsModal');
      },
    });
  }
}

/* ---------------- sections modal ---------------- */

function renderSectionChecks() {
  const host = $('#sectionChecks');
  host.innerHTML = SECTIONS.map(
    (s) => `<label class="check">
      <input type="checkbox" value="${s.id}" ${state.sectionIds.includes(s.id) ? 'checked' : ''}>
      <span>${s.icon} ${s.title}${s.optional ? ' <em style="color:var(--muted);font-style:normal">(extra)</em>' : ''}</span>
    </label>`
  ).join('');
  $$('#sectionChecks input').forEach((input) =>
    input.addEventListener('change', () => {
      state.sectionIds = $$('#sectionChecks input:checked').map((i) => i.value);
      updateSectionsChip();
    })
  );
}

function updateSectionsChip() {
  $('#btnSections').textContent = `🧩 Sections (${state.sectionIds.length})`;
}

$('#btnSections').addEventListener('click', () => {
  renderSectionChecks();
  openModal('#sectionsModal');
});
$('#btnSectionsCore').addEventListener('click', () => {
  state.sectionIds = [...DEFAULT_SECTION_IDS];
  renderSectionChecks();
  updateSectionsChip();
});
$('#btnSectionsAll').addEventListener('click', () => {
  state.sectionIds = [...ALL_SECTION_IDS];
  renderSectionChecks();
  updateSectionsChip();
});
$('#btnSectionsDone').addEventListener('click', () => {
  if (!state.sectionIds.length) {
    state.sectionIds = [...DEFAULT_SECTION_IDS];
    updateSectionsChip();
    toast('At least one section is required — core sections restored.');
  }
  closeModal('#sectionsModal');
});

/* ---------------- source pill ---------------- */

function renderSourcePill() {
  const host = $('#sourcePill');
  if (!state.source) {
    host.innerHTML = '';
    return;
  }
  const words = state.source.text.split(/\s+/).filter(Boolean).length;
  host.innerHTML = `<span class="file-pill">${state.source.kind} ${state.source.label} · ${words.toLocaleString()} words<button type="button" id="btnClearSource" aria-label="Remove source">✕</button></span>`;
  $('#btnClearSource').addEventListener('click', () => {
    state.source = null;
    renderSourcePill();
  });
}

/* ---------------- upload ---------------- */

$('#btnUpload').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const chip = $('#btnUpload');
  chip.textContent = '⏳ Reading…';
  try {
    const result = await extractFile(file, (page, total) => {
      chip.textContent = `⏳ Page ${page}/${total}`;
    });
    state.source = { text: result.text, label: file.name, kind: '📄' };
    renderSourcePill();
    if (!$('#topic').value.trim()) {
      $('#topic').value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
    }
    toast('File loaded — your notes will be grounded in it.');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    chip.textContent = '📄 Upload';
  }
});

/* drag & drop anywhere on the composer */
const composer = $('#composerForm');
['dragover', 'dragenter'].forEach((type) =>
  composer.addEventListener(type, (event) => {
    event.preventDefault();
    composer.style.borderColor = 'var(--purple)';
  })
);
['dragleave', 'drop'].forEach((type) =>
  composer.addEventListener(type, () => {
    composer.style.borderColor = '';
  })
);
composer.addEventListener('drop', async (event) => {
  event.preventDefault();
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  try {
    const result = await extractFile(file);
    state.source = { text: result.text, label: file.name, kind: '📄' };
    renderSourcePill();
    toast('File loaded');
  } catch (err) {
    toast(err.message, 'error');
  }
});

/* ---------------- YouTube ---------------- */

$('#btnYouTube').addEventListener('click', async () => {
  const existing = $('#topic').value.trim();
  const url = parseYouTubeId(existing) ? existing : window.prompt('Paste the YouTube video link:');
  if (!url) return;
  const chip = $('#btnYouTube');
  chip.textContent = '⏳ Fetching…';
  try {
    const result = await fetchYouTubeTranscript(url);
    state.source = { text: result.text, label: result.title || 'YouTube transcript', kind: '▶️' };
    renderSourcePill();
    if (result.title) $('#topic').value = result.title;
    else if (parseYouTubeId(existing)) $('#topic').value = '';
    toast('Transcript loaded');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    chip.textContent = '▶️ YouTube';
  }
});

/* ---------------- dictation ---------------- */

$('#btnRecord').addEventListener('click', () => {
  const chip = $('#btnRecord');
  if (state.dictation) {
    state.dictation.stop();
    state.dictation = null;
    chip.classList.remove('active');
    chip.textContent = '🎤 Record';
    return;
  }
  if (!speechSupported()) {
    toast('Live dictation needs Chrome or Edge. Upload a file instead.', 'error');
    return;
  }
  const box = $('#topic');
  const base = box.value;
  chip.classList.add('active');
  chip.textContent = '⏹ Stop';
  state.dictation = startDictation({
    lang: $('#language').value === 'hi' ? 'hi-IN' : 'en-IN',
    onText: ({ final, interim }) => {
      box.value = `${base}${base ? ' ' : ''}${final} ${interim}`.trim();
    },
    onEnd: () => {
      state.dictation = null;
      chip.classList.remove('active');
      chip.textContent = '🎤 Record';
    },
    onError: (err) => {
      toast(err.message, 'error');
      state.dictation = null;
      chip.classList.remove('active');
      chip.textContent = '🎤 Record';
    },
  });
});

/* ---------------- deep research toggle ---------------- */

$('#btnResearch').addEventListener('click', () => {
  state.research = !state.research;
  const chip = $('#btnResearch');
  chip.classList.toggle('active', state.research);
  chip.setAttribute('aria-pressed', String(state.research));
  toast(state.research ? 'Deep research on — sources will be cited.' : 'Deep research off');
});

/* ---------------- quality / language ---------------- */

$('#quality').addEventListener('change', (e) => {
  saveConfig({ quality: e.target.value });
  refreshProviderNote();
});
$('#language').addEventListener('change', (e) => saveConfig({ language: e.target.value }));

/* ---------------- generation ---------------- */

function renderProgress(events) {
  const host = $('#progress');
  const pct = events.total ? Math.round((events.done / events.total) * 100) : 0;
  host.innerHTML = `<div class="progress-card">
    <h3>${events.title || 'Generating your notes'}</h3>
    <p class="stage">${events.stage || ''}</p>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <ul class="steps">${events.lines.join('')}</ul>
    <div style="margin-top:16px"><button class="btn btn-ghost btn-sm" type="button" id="btnCancelGen">Cancel</button></div>
  </div>`;
  $('#btnCancelGen')?.addEventListener('click', () => {
    state.abort?.abort();
    toast('Generation cancelled');
  });
}

composer.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (state.generating) return;

  let cfg = getConfig();
  if (!cfg.isConfigured) {
    // Re-check the site's shared key before ever asking the visitor for one.
    await probeServer();
    cfg = getConfig();
    refreshProviderNote();
    renderKeyBanner();
  }
  if (!cfg.isConfigured) {
    loadSettingsForm();
    openModal('#settingsModal');
    toast('Add your API key first', 'error');
    return;
  }

  let topic = $('#topic').value.trim();

  // A bare YouTube link in the box is treated as a video source.
  if (parseYouTubeId(topic) && !state.source) {
    try {
      const result = await fetchYouTubeTranscript(topic);
      state.source = { text: result.text, label: result.title || 'YouTube transcript', kind: '▶️' };
      topic = result.title || 'YouTube lecture notes';
      renderSourcePill();
    } catch (err) {
      toast(err.message, 'error');
      return;
    }
  }

  if (!topic && state.source) topic = state.source.label.replace(/\.[^.]+$/, '');
  if (!topic) {
    toast('Type a topic, upload a file, or paste a YouTube link.', 'error');
    $('#topic').focus();
    return;
  }

  state.generating = true;
  state.abort = new AbortController();
  $('#btnGenerate').disabled = true;

  const tracker = { done: 0, total: 0, stage: 'Understanding your topic…', title: topic, lines: [] };
  const lineFor = (id, icon, text) => `<li data-id="${id}" class="${icon === '✓' ? 'done' : icon === '✗' ? 'failed' : ''}"><span class="dot">${icon}</span>${text}</li>`;
  const upsert = (id, icon, text) => {
    const index = tracker.lines.findIndex((l) => l.includes(`data-id="${id}"`));
    const line = lineFor(id, icon, text);
    if (index >= 0) tracker.lines[index] = line;
    else tracker.lines.push(line);
  };

  renderProgress(tracker);

  try {
    const lesson = await generateLesson({
      topic,
      sourceText: state.source?.text || '',
      sourceLabel: state.source?.label || '',
      sectionIds: state.sectionIds,
      research: state.research,
      folderId: $('#folderSelect').value || null,
      signal: state.abort.signal,
      onEvent: (e) => {
        if (e.type === 'stage') tracker.stage = e.label;
        if (e.type === 'progress') {
          tracker.done = e.done;
          tracker.total = e.total;
        }
        if (e.type === 'plan') tracker.title = `${e.plan.emoji || '📚'} ${e.plan.title}`;
        if (e.type === 'researchStart') upsert('research', '●', `Searching ${e.queries.length} reference queries…`);
        if (e.type === 'researchDone') upsert('research', '✓', `${e.count} reference sources found`);
        if (e.type === 'sectionStart') upsert(e.id, '●', `${e.title}…`);
        if (e.type === 'sectionDone') upsert(e.id, '✓', e.title);
        if (e.type === 'sectionFailed') upsert(e.id, '✗', `${e.title} — ${e.message}`);
        if (e.type === 'warn') toast(e.message);
        renderProgress(tracker);
      },
    });

    $('#progress').innerHTML = '';
    $('#topic').value = '';
    state.source = null;
    renderSourcePill();
    await renderLessons();

    if (lesson.failedSections.length) {
      toast(`${lesson.failedSections.length} section(s) failed — open the lesson to retry them.`, 'error');
    }
    location.href = `./lesson.html?id=${encodeURIComponent(lesson.id)}`;
  } catch (err) {
    $('#progress').innerHTML = '';
    if (err?.name !== 'AbortError') {
      clearBanners('#banners');
      banner('#banners', { kind: 'error', title: 'Generation failed', body: err.message });
      toast(err.message, 'error');
    }
  } finally {
    state.generating = false;
    state.abort = null;
    $('#btnGenerate').disabled = false;
  }
});

/* Cmd/Ctrl+Enter submits; "/" focuses the box. */
$('#topic').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    composer.requestSubmit();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
    event.preventDefault();
    $('#topic').focus();
  }
});

/* ---------------- folders ---------------- */

async function refreshFolderSelect() {
  const folders = await listFolders();
  const select = $('#folderSelect');
  const current = select.value;
  select.innerHTML = `<option value="">No folder</option>${folders
    .map((f) => `<option value="${f.id}">${escapeAttr(f.name)}</option>`)
    .join('')}`;
  select.value = current;
}

async function createFolder() {
  const name = window.prompt('Folder name (e.g. “Physics — Semester 1”):');
  if (!name?.trim()) return;
  await putFolder({ id: newId('f'), name: name.trim() });
  await refreshFolderSelect();
  await renderLessons();
  toast('Folder created');
}

$('#btnNewFolder').addEventListener('click', createFolder);
$('#navFolder').addEventListener('click', createFolder);

/* ---------------- lessons list ---------------- */

const escapeAttr = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function lessonRow(lesson) {
  const count = lesson.sections?.length || 0;
  const failed = lesson.failedSections?.length || 0;
  const meta = [
    `${count} sections`,
    lesson.plan?.subject || '',
    `Opened ${timeAgo(lesson.openedAt || lesson.updatedAt)}`,
    failed ? `⚠️ ${failed} to retry` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return `<div class="lesson-row">
    <span class="ico" aria-hidden="true">${escapeAttr(lesson.emoji || '📚')}</span>
    <a class="body" href="./lesson.html?id=${encodeURIComponent(lesson.id)}" style="text-decoration:none;color:inherit">
      <strong>${escapeAttr(lesson.title)}</strong>
      <span>${escapeAttr(meta)}</span>
    </a>
    <button class="btn btn-quiet btn-sm" type="button" data-del="${lesson.id}" aria-label="Delete lesson">Delete</button>
    <a class="go" href="./lesson.html?id=${encodeURIComponent(lesson.id)}">Start &rarr;</a>
  </div>`;
}

async function renderLessons() {
  const [lessons, folders] = await Promise.all([listLessons(), listFolders()]);
  const host = $('#lessonsList');

  if (!lessons.length) {
    host.innerHTML = `<div class="empty">
      <strong>No lessons yet</strong>
      Type a topic above, upload a PDF, or paste a YouTube link to generate your first set of deep notes.
    </div>`;
    return;
  }

  const groups = [];
  for (const folder of folders) {
    const rows = lessons.filter((l) => l.folderId === folder.id);
    if (rows.length) {
      groups.push(`<div class="folder-group">
        <h3 class="folder-title">📁 ${escapeAttr(folder.name)} <span>(${rows.length})</span>
          <button class="btn btn-quiet btn-sm" type="button" data-delfolder="${folder.id}">Remove folder</button>
        </h3>
        ${rows.map(lessonRow).join('')}
      </div>`);
    }
  }
  const loose = lessons.filter((l) => !l.folderId || !folders.some((f) => f.id === l.folderId));
  if (loose.length) {
    groups.push(
      `<div class="folder-group">${groups.length ? '<h3 class="folder-title">Unfiled</h3>' : ''}${loose
        .map(lessonRow)
        .join('')}</div>`
    );
  }
  host.innerHTML = groups.join('');

  $$('[data-del]', host).forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!window.confirm('Delete this lesson permanently?')) return;
      await deleteLesson(btn.dataset.del);
      await renderLessons();
      toast('Lesson deleted');
    })
  );
  $$('[data-delfolder]', host).forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (!window.confirm('Remove this folder? Its lessons will move to Unfiled.')) return;
      await deleteFolder(btn.dataset.delfolder);
      await refreshFolderSelect();
      await renderLessons();
      toast('Folder removed');
    })
  );
}

$('#navLessons').addEventListener('click', () => {
  $('#lessonsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#navDue').addEventListener('click', async () => {
  const lessons = await listLessons();
  const withCards = lessons.find((l) => l.sections?.some((s) => s.id === 'flashcards'));
  if (!withCards) {
    toast('No flashcards yet — add the Flashcards section to a lesson.');
    return;
  }
  location.href = `./lesson.html?id=${encodeURIComponent(withCards.id)}&tab=flashcards`;
});

/* ---------------- backup ---------------- */

$('#navExport').addEventListener('click', async () => {
  const payload = await exportAll();
  downloadBlob(
    `studyforge-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json'
  );
  toast(`${payload.lessons.length} lessons backed up`);
});
$('#navImport').addEventListener('click', () => $('#importInput').click());
$('#importInput').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    const count = await importAll(JSON.parse(await file.text()));
    await refreshFolderSelect();
    await renderLessons();
    toast(`${count} lessons restored`);
  } catch (err) {
    toast(`Restore failed: ${err.message}`, 'error');
  }
});

$('#navTheme').addEventListener('click', () => toggleTheme());

/* ---------------- boot ---------------- */

(async function boot() {
  const cfg = getConfig();
  $('#quality').value = cfg.quality;
  $('#language').value = cfg.language;
  updateSectionsChip();

  // Zero-setup path: if the site owner set AI_API_KEY on Cloudflare, the visitor
  // needs no key at all. Probe first so no "add your key" prompt ever appears.
  await probeServer();
  refreshProviderNote();
  renderKeyBanner();
  renderServerStatus();
  lockToOwnerKey();
  await refreshFolderSelect();
  await renderLessons();
})();
