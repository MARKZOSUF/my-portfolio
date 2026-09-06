/* Source ingestion: PDF, DOCX, images (OCR-free path), plain text, YouTube and
 * microphone recording. Everything runs in the browser.
 * pdf.js and mammoth are loaded lazily from a CDN and every path degrades
 * gracefully, so a missing CDN never breaks the app or the deploy.
 */

const CDN = {
  pdfjs: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs',
  pdfWorker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs',
  mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js',
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      if (existing.dataset.loaded === '1') resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.crossOrigin = 'anonymous';
    el.onload = () => {
      el.dataset.loaded = '1';
      resolve();
    };
    el.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(el);
  });
}

export async function extractPdf(file, onProgress) {
  let pdfjs;
  try {
    pdfjs = await import(/* @vite-ignore */ CDN.pdfjs);
  } catch {
    throw new Error(
      'PDF reader could not load (you may be offline). Paste the text of your PDF into the topic box instead.'
    );
  }
  pdfjs.GlobalWorkerOptions.workerSrc = CDN.pdfWorker;
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let lastY = null;
    let text = '';
    for (const item of content.items) {
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 4) text += '\n';
      text += item.str;
      lastY = y;
    }
    pages.push(text.trim());
    if (onProgress) onProgress(p, doc.numPages);
  }
  const joined = pages.filter(Boolean).join('\n\n');
  if (!joined.trim()) {
    throw new Error(
      'This PDF has no extractable text (it is probably a scan). Type the topic name instead and StudyForge will generate notes from scratch.'
    );
  }
  return { text: joined, pageCount: doc.numPages };
}

export async function extractDocx(file) {
  try {
    await loadScript(CDN.mammoth);
  } catch {
    throw new Error('DOCX reader could not load (you may be offline). Save your file as .txt and upload again.');
  }
  const buffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
  return { text: (result.value || '').trim(), pageCount: 0 };
}

export async function extractText(file) {
  return { text: (await file.text()).trim(), pageCount: 0 };
}

/** Route a File to the right extractor. */
export async function extractFile(file, onProgress) {
  const name = (file.name || '').toLowerCase();
  const type = file.type || '';
  if (file.size > 40 * 1024 * 1024) {
    throw new Error('That file is larger than 40 MB. Split it into smaller parts and upload again.');
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) return extractPdf(file, onProgress);
  if (name.endsWith('.docx')) return extractDocx(file);
  if (
    type.startsWith('text/') ||
    /\.(txt|md|markdown|csv|tex|json|srt|vtt)$/.test(name)
  ) {
    return extractText(file);
  }
  if (type.startsWith('image/')) {
    throw new Error(
      'Images need OCR, which is not available offline. Type the topic name, or upload a text-based PDF.'
    );
  }
  throw new Error(`Unsupported file type: ${file.name}. Use PDF, DOCX, TXT or MD.`);
}

/* ---------------- YouTube ---------------- */

export function parseYouTubeId(url) {
  const value = (url || '').trim();
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/(?:embed|shorts|live)\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const match = value.match(re);
    if (match) return match[1];
  }
  return /^[\w-]{11}$/.test(value) ? value : null;
}

/**
 * Fetch a YouTube transcript through the site's own Pages Function
 * (`functions/api/youtube.js`), which avoids browser CORS restrictions.
 */
export async function fetchYouTubeTranscript(url) {
  const id = parseYouTubeId(url);
  if (!id) throw new Error('That does not look like a YouTube link.');
  const response = await fetch(`/api/youtube?v=${encodeURIComponent(id)}`);
  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.json()).error || '';
    } catch {
      /* ignore */
    }
    throw new Error(
      detail ||
        'Could not fetch that video transcript. The video may have captions disabled — paste the topic name instead.'
    );
  }
  const data = await response.json();
  if (!data.text || !data.text.trim()) {
    throw new Error('That video has no captions available. Try another video or type the topic name.');
  }
  return { text: data.text, title: data.title || '', videoId: id };
}

/* ---------------- microphone ---------------- */

export function speechSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Live dictation using the browser's own speech engine. No API key needed.
 * Returns a controller with `stop()`.
 */
export function startDictation({ lang = 'en-IN', onText, onEnd, onError }) {
  const Impl = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Impl) {
    onError?.(new Error('Your browser does not support live dictation. Use Chrome or Edge, or upload a file.'));
    return { stop() {} };
  }
  const recognition = new Impl();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = '';
  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) finalText += `${result[0].transcript} `;
      else interim += result[0].transcript;
    }
    onText?.({ final: finalText.trim(), interim: interim.trim() });
  };
  recognition.onerror = (event) => onError?.(new Error(`Dictation error: ${event.error}`));
  recognition.onend = () => onEnd?.(finalText.trim());

  try {
    recognition.start();
  } catch (err) {
    onError?.(err);
  }
  return {
    stop() {
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}

/** Trim source text to a token-safe window, keeping the beginning and end. */
export function clampSource(text, maxChars = 24000) {
  const value = (text || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (value.length <= maxChars) return value;
  const head = value.slice(0, Math.floor(maxChars * 0.65));
  const tail = value.slice(-Math.floor(maxChars * 0.3));
  return `${head}\n\n[... middle of the document omitted to fit the model context ...]\n\n${tail}`;
}
