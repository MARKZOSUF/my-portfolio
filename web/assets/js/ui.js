/* Shared UI helpers: toasts, banners, modals, theme, formatting. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function toast(message, kind = '') {
  const host = $('#toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = ('toast ' + kind).trim();
  el.setAttribute('role', 'status');
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), kind === 'error' ? 7000 : 4000);
}

export function banner(hostSel, opts = {}) {
  const { kind = '', title = '', body = '', actionLabel = '', onAction = null } = opts;
  const host = typeof hostSel === 'string' ? $(hostSel) : hostSel;
  if (!host) return null;
  const el = document.createElement('div');
  el.className = ('banner ' + kind).trim();
  const grow = document.createElement('div');
  grow.className = 'grow';
  if (title) {
    const strong = document.createElement('strong');
    strong.textContent = title;
    grow.appendChild(strong);
  }
  if (body) {
    const span = document.createElement('span');
    span.textContent = body;
    grow.appendChild(span);
  }
  el.appendChild(grow);
  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm';
    btn.textContent = actionLabel;
    btn.addEventListener('click', onAction);
    el.appendChild(btn);
  }
  host.appendChild(el);
  return el;
}

export function clearBanners(hostSel) {
  const host = typeof hostSel === 'string' ? $(hostSel) : hostSel;
  if (host) host.innerHTML = '';
}

/* ---------------- modals ---------------- */

let lastFocus = null;

export function openModal(sel) {
  const el = $(sel);
  if (!el) return;
  lastFocus = document.activeElement;
  el.hidden = false;
  const focusable = el.querySelector('input, select, textarea, button');
  if (focusable) focusable.focus();
}

export function closeModal(sel) {
  const el = $(sel);
  if (!el) return;
  el.hidden = true;
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

export function wireModals() {
  $$('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) backdrop.hidden = true;
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = $$('.modal-backdrop').find((el) => !el.hidden);
    if (open) {
      open.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  });
}

/* ---------------- theme ---------------- */

const THEME_KEY = 'studyforge.theme';

export function initTheme(defaultTheme = 'dark') {
  let stored = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch (err) {
    stored = null;
  }
  const theme = stored || defaultTheme;
  document.documentElement.dataset.theme = theme;
  return theme;
}

export function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (err) {
    /* ignore private-mode storage errors */
  }
  return next;
}

/* ---------------- formatting ---------------- */

export function timeAgo(ts) {
  if (!ts) return 'just now';
  const seconds = Math.max(1, Math.round((Date.now() - ts) / 1000));
  const units = [
    [31536000, 'year'],
    [2592000, 'month'],
    [604800, 'week'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];
  for (const pair of units) {
    if (seconds >= pair[0]) {
      const value = Math.floor(seconds / pair[0]);
      return value + ' ' + pair[1] + (value > 1 ? 's' : '') + ' ago';
    }
  }
  return 'just now';
}

export function downloadBlob(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeFilename(name) {
  const cleaned = String(name || 'studyforge-notes')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return cleaned || 'studyforge-notes';
}

export function setBusy(button, busy, busyLabel = 'Working...') {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.disabled = true;
    button.textContent = busyLabel;
  } else {
    button.disabled = false;
    if (button.dataset.label) button.textContent = button.dataset.label;
  }
}
