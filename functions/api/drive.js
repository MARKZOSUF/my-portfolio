
import { json, requireUser } from "../_shared/auth.js";
import { enforceRateLimit } from "../_shared/security.js";

export async function onRequestPost({ request, env }) {
  try { await requireUser(request, env); }
  catch (error) { return json({ error: error.message }, error.status || 401); }
  await enforceRateLimit(request, env, "drive-import", 8, 300);
  const body = await request.json().catch(() => ({}));
  const originalUrl = String(body.url || "").trim();

  let parsed;
  try { parsed = new URL(originalUrl); }
  catch { return json({ error: "Enter a valid Google Drive share link." }, 400); }

  if (!isAllowedGoogleHost(parsed.hostname)) {
    return json({ error: "Only Google Drive or Google Docs links are supported." }, 400);
  }

  const id = extractFileId(parsed);
  if (!id) return json({ error: "The Google Drive file ID could not be found." }, 400);

  let response;
  try { response = await fetchGoogleFile(createExportUrl(parsed, id)); }
  catch (error) { return json({ error: error.message || "Google Drive import failed." }, 400); }

  if (!response.ok) {
    return json({ error: `Google Drive returned ${response.status}. Share the file as “Anyone with the link”.` }, 400);
  }

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 10 * 1024 * 1024) {
    return json({ error: "Public Drive import is limited to 10 MB." }, 413);
  }

  if (contentType.includes("text/html")) {
    const text = new TextDecoder().decode(buffer);
    if (/accounts\.google\.com|Sign in|Request access|virus scan/i.test(text)) {
      return json({ error: "The file is private, needs sign-in, or Google blocked the direct download." }, 400);
    }
  }

  const disposition = response.headers.get("content-disposition") || "";
  return json({
    name: getFilename(disposition) || inferFilename(parsed, contentType, id),
    mime: contentType.split(";")[0],
    size: buffer.byteLength,
    base64: bytesToBase64(new Uint8Array(buffer))
  });
}

async function fetchGoogleFile(initialUrl) {
  let url = new URL(initialUrl);
  for (let redirects = 0; redirects <= 4; redirects++) {
    if (!isAllowedGoogleHost(url.hostname)) throw new Error("Google Drive returned an unsafe redirect.");
    const response = await fetch(url.toString(), {
      redirect: "manual",
      headers: { "User-Agent": "MARKZOSUF-AI-NEXUS/15.1.0" }
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    url = new URL(location, url);
  }
  throw new Error("Google Drive returned too many redirects.");
}

function isAllowedGoogleHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "drive.google.com" || host === "docs.google.com" || host === "drive.usercontent.google.com" || host.endsWith(".googleusercontent.com");
}

function extractFileId(url) {
  return url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || url.searchParams.get("id") || "";
}

function createExportUrl(url, id) {
  if (url.hostname === "docs.google.com") {
    if (url.pathname.includes("/document/")) return `https://docs.google.com/document/d/${id}/export?format=txt`;
    if (url.pathname.includes("/spreadsheets/")) return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
    if (url.pathname.includes("/presentation/")) return `https://docs.google.com/presentation/d/${id}/export/pdf`;
  }
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;
}

function getFilename(disposition) {
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) return decodeURIComponent(utf[1]);
  return disposition.match(/filename="?([^";]+)"?/i)?.[1] || "";
}

function inferFilename(url, mime, id) {
  if (url.pathname.includes("/document/")) return `google-doc-${id}.txt`;
  if (url.pathname.includes("/spreadsheets/")) return `google-sheet-${id}.csv`;
  if (url.pathname.includes("/presentation/")) return `google-slides-${id}.pdf`;
  const extensions = {
    "application/pdf": "pdf", "text/plain": "txt", "text/csv": "csv",
    "application/json": "json", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"
  };
  return `drive-file-${id}.${extensions[mime.split(";")[0]] || "bin"}`;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}
