import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignored = new Set(["node_modules", ".wrangler", ".git"]);
const failures = [];

function walk(directory) {
  return readdirSync(directory).flatMap(name => {
    if (ignored.has(name)) return [];
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(root);
const relative = path => path.slice(root.length + 1);
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));

if (packageJson.version !== packageLock.version || packageJson.version !== packageLock.packages?.[""]?.version) {
  failures.push("package.json and package-lock.json versions do not match");
}

for (const file of files.filter(path =>
  (extname(path) === ".js" || extname(path) === ".mjs")
  && !path.startsWith(join(root, "assets", "vendor"))
)) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) failures.push(`${relative(file)}: ${result.stderr.trim() || "JavaScript parse failed"}`);
}

for (const file of files.filter(path => extname(path) === ".json" || extname(path) === ".webmanifest")) {
  try { JSON.parse(readFileSync(file, "utf8")); }
  catch (error) { failures.push(`${relative(file)}: invalid JSON (${error.message})`); }
}

for (const file of files.filter(path => extname(path) === ".css")) {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (const character of css) {
    if (escaped) { escaped = false; continue; }
    if (character === "\\" && quote) { escaped = true; continue; }
    if (quote) { if (character === quote) quote = ""; continue; }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth < 0) break;
  }
  if (depth !== 0 || quote) failures.push(`${relative(file)}: unbalanced CSS braces or quotes`);
}

for (const file of files.filter(path => extname(path) === ".html")) {
  const html = readFileSync(file, "utf8");
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  for (const id of new Set(ids)) if (ids.filter(value => value === id).length > 1) failures.push(`${relative(file)}: duplicate id "${id}"`);

  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
    const reference = match[1].split(/[?#]/)[0];
    if (!reference || reference === "/" || /^(?:https?:|data:|blob:|mailto:)/.test(reference)) continue;
    const target = reference.startsWith("/") ? join(root, reference.slice(1)) : resolve(dirname(file), reference);
    if (!existsSync(target)) failures.push(`${relative(file)}: missing local reference ${match[1]}`);
  }
}

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const localIndexAssets = [...indexHtml.matchAll(/\b(?:src|href)=["'](\/assets\/[^"']+)["']/g)].map(match => match[1]);
for (const asset of localIndexAssets) {
  const version = new URL(asset, "https://nexus.invalid").searchParams.get("v");
  if (version !== packageJson.version) failures.push(`index.html: ${asset} must use v=${packageJson.version}`);
}

if (/<(?:script|link)\b[^>]+(?:src|href)=["']https?:\/\//i.test(indexHtml)) {
  failures.push("index.html: production scripts and styles must be local, not CDN-hosted");
}

for (const match of indexHtml.matchAll(/<script\b([^>]*)\bsrc=["']([^"']+)["'][^>]*>/gi)) {
  const attributes = match[1] || "";
  const reference = match[2].split(/[?#]/)[0];
  if (!reference.startsWith("/") || /\btype=["']module["']/i.test(attributes)) continue;
  const source = readFileSync(join(root, reference.slice(1)), "utf8");
  if (/\brequire\s*\(/.test(source)) failures.push(`index.html: classic browser script ${reference} contains CommonJS require()`);
}

const browserSources = files
  .filter(path => path.startsWith(join(root, "assets")) && !path.startsWith(join(root, "assets", "vendor")) && /\.(?:js|html)$/.test(path))
  .map(path => readFileSync(path, "utf8"))
  .join("\n");
const declaredBrowserIds = new Set([
  ...indexHtml.matchAll(/\bid=["']([^"']+)["']/g),
  ...browserSources.matchAll(/\bid=["']([^"']+)["']/g),
  ...browserSources.matchAll(/\.id\s*=\s*["']([^"']+)["']/g),
  ...browserSources.matchAll(/setAttribute\(\s*["']id["']\s*,\s*["']([^"']+)["']\s*\)/g)
].map(match => match[1]));
const referencedBrowserIds = new Set([...browserSources.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(match => match[1]));
for (const id of referencedBrowserIds) {
  if (!declaredBrowserIds.has(id)) failures.push(`browser source references missing element id "${id}"`);
}

if (/https:\/\/(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\/[^"']*pdf(?:\.min)?\.mjs/.test(browserSources)) {
  failures.push("PDF runtime must use the bundled local vendor copy");
}

const required = [
  "index.html", "manifest.webmanifest", "sw.js", "schema.sql", "MIGRATE-V11-1.sql",
  "functions/_middleware.js", "functions/_shared/security.js", "functions/api/chat.js", "functions/api/health.js",
  "privacy.html", "terms.html", "SECURITY.md", "SETUP-CLOUDFLARE.md"
];
for (const name of required) if (!existsSync(join(root, name))) failures.push(`missing required file: ${name}`);

const manifest = JSON.parse(readFileSync(join(root, "manifest.webmanifest"), "utf8"));
for (const icon of manifest.icons || []) {
  const path = String(icon.src || "").split(/[?#]/)[0].replace(/^\//, "");
  if (!path || !existsSync(join(root, path))) failures.push(`manifest.webmanifest: missing icon ${icon.src || "(empty)"}`);
}

const serviceWorker = readFileSync(join(root, "sw.js"), "utf8");
for (const match of serviceWorker.matchAll(/["'](\/(?:assets\/[^"']+|index\.html|manifest\.webmanifest))["']/g)) {
  const path = match[1].split(/[?#]/)[0].replace(/^\//, "");
  if (!existsSync(join(root, path))) failures.push(`sw.js: missing cached asset ${match[1]}`);
}
for (const asset of localIndexAssets) {
  if (!serviceWorker.includes(`"${asset}"`)) failures.push(`sw.js: index asset is not pre-cached ${asset}`);
}
if (!serviceWorker.includes(packageJson.version.replaceAll(".", "-"))) {
  failures.push(`sw.js: cache name does not include version ${packageJson.version}`);
}

const source = files.filter(path => /\.(?:js|mjs|html|md|toml|sql)$/.test(path)).map(path => readFileSync(path, "utf8")).join("\n");
if (/Access-Control-Allow-Origin["']?\s*[:=]\s*["']\*/.test(source)) failures.push("wildcard Access-Control-Allow-Origin detected");
if (/PASTE_(?:D1|KV)_[A-Z_]+/.test(readFileSync(join(root, "wrangler.scheduler.toml.example"), "utf8")) === false) failures.push("scheduler template is missing its explicit placeholder");

if (failures.length) {
  console.error(`Validation failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Project validation passed: ${files.length} files checked.`);
