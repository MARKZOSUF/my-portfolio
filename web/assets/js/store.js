/* Local-first lesson store (IndexedDB with a localStorage fallback).
 * Nothing leaves the browser except the AI request itself.
 */

const DB_NAME = 'studyforge';
const DB_VERSION = 1;
const LESSONS = 'lessons';
const FOLDERS = 'folders';
const PROGRESS = 'progress';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('no-idb'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LESSONS)) {
        const store = db.createObjectStore(LESSONS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('folderId', 'folderId');
      }
      if (!db.objectStoreNames.contains(FOLDERS)) {
        db.createObjectStore(FOLDERS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROGRESS)) {
        db.createObjectStore(PROGRESS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(() => null);
  return dbPromise;
}

/* ---- localStorage fallback ---- */
const LS_PREFIX = 'studyforge.fallback.';
const lsRead = (name) => {
  try {
    return JSON.parse(localStorage.getItem(LS_PREFIX + name) || '[]');
  } catch {
    return [];
  }
};
const lsWrite = (name, rows) => {
  try {
    localStorage.setItem(LS_PREFIX + name, JSON.stringify(rows));
  } catch {
    /* quota — ignore */
  }
};

async function tx(storeName, mode, fn) {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    try {
      result = fn(store);
    } catch (err) {
      reject(err);
      return;
    }
    transaction.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
    transaction.onerror = () => reject(transaction.error);
  });
}

export function newId(prefix = 'l') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ---------------- lessons ---------------- */

export async function putLesson(lesson) {
  const row = { ...lesson, updatedAt: Date.now() };
  const db = await openDb();
  if (db) {
    await tx(LESSONS, 'readwrite', (store) => store.put(row));
  } else {
    const rows = lsRead(LESSONS).filter((r) => r.id !== row.id);
    rows.push(row);
    lsWrite(LESSONS, rows);
  }
  return row;
}

export async function getLesson(id) {
  const db = await openDb();
  if (db) {
    const value = await tx(LESSONS, 'readonly', (store) => store.get(id));
    return value || null;
  }
  return lsRead(LESSONS).find((r) => r.id === id) || null;
}

export async function listLessons() {
  const db = await openDb();
  let rows;
  if (db) {
    rows = (await tx(LESSONS, 'readonly', (store) => store.getAll())) || [];
  } else {
    rows = lsRead(LESSONS);
  }
  return rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function deleteLesson(id) {
  const db = await openDb();
  if (db) {
    await tx(LESSONS, 'readwrite', (store) => store.delete(id));
  } else {
    lsWrite(LESSONS, lsRead(LESSONS).filter((r) => r.id !== id));
  }
}

/* ---------------- folders ---------------- */

export async function listFolders() {
  const db = await openDb();
  if (db) return (await tx(FOLDERS, 'readonly', (store) => store.getAll())) || [];
  return lsRead(FOLDERS);
}

export async function putFolder(folder) {
  const row = { ...folder, updatedAt: Date.now() };
  const db = await openDb();
  if (db) {
    await tx(FOLDERS, 'readwrite', (store) => store.put(row));
  } else {
    const rows = lsRead(FOLDERS).filter((r) => r.id !== row.id);
    rows.push(row);
    lsWrite(FOLDERS, rows);
  }
  return row;
}

export async function deleteFolder(id) {
  const db = await openDb();
  if (db) {
    await tx(FOLDERS, 'readwrite', (store) => store.delete(id));
  } else {
    lsWrite(FOLDERS, lsRead(FOLDERS).filter((r) => r.id !== id));
  }
  const lessons = await listLessons();
  await Promise.all(
    lessons.filter((l) => l.folderId === id).map((l) => putLesson({ ...l, folderId: null }))
  );
}

/* ---------------- spaced repetition ---------------- */

/** SM-2-lite scheduler. grade: 0 again, 1 hard, 2 good, 3 easy. */
export function schedule(card, grade) {
  const now = Date.now();
  const day = 86400000;
  let ease = card.ease ?? 2.5;
  let reps = card.reps ?? 0;
  let interval = card.interval ?? 0;

  if (grade === 0) {
    reps = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    ease = Math.min(3.0, Math.max(1.3, ease + (grade === 1 ? -0.15 : grade === 3 ? 0.1 : 0)));
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * ease);
    if (grade === 1) interval = Math.max(1, Math.round(interval * 0.6));
  }
  return { ...card, ease, reps, interval, due: now + Math.max(10 * 60000, interval * day), lastGrade: grade };
}

export async function getProgress(id) {
  const db = await openDb();
  if (db) return (await tx(PROGRESS, 'readonly', (store) => store.get(id))) || null;
  return lsRead(PROGRESS).find((r) => r.id === id) || null;
}

export async function putProgress(row) {
  const db = await openDb();
  if (db) {
    await tx(PROGRESS, 'readwrite', (store) => store.put(row));
  } else {
    const rows = lsRead(PROGRESS).filter((r) => r.id !== row.id);
    rows.push(row);
    lsWrite(PROGRESS, rows);
  }
  return row;
}

/* ---------------- import / export ---------------- */

export async function exportAll() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    lessons: await listLessons(),
    folders: await listFolders(),
  };
}

export async function importAll(payload) {
  if (!payload || !Array.isArray(payload.lessons)) throw new Error('Invalid backup file.');
  for (const folder of payload.folders || []) await putFolder(folder);
  for (const lesson of payload.lessons) await putLesson(lesson);
  return payload.lessons.length;
}
