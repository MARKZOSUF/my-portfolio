import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = resolve(root, "assets", "vendor");
const context = { console };
context.self = context;
context.window = context;

for (const file of [
  "marked-15.0.7.min.js",
  "dompurify-3.2.4.min.js",
  "highlight-11.11.1.min.js"
]) {
  const source = readFileSync(resolve(vendor, file), "utf8");
  assert.ok(source.length > 10_000, `${file} is unexpectedly small.`);
  vm.runInNewContext(source, context, { filename: file, timeout: 5000 });
}

assert.equal(typeof context.marked?.parse, "function");
assert.equal(typeof context.DOMPurify, "function");
assert.equal(context.DOMPurify.version, "3.2.4");
assert.equal(typeof context.hljs?.highlight, "function");
assert.match(context.marked.parse("**Nexus**"), /<strong>Nexus<\/strong>/);
assert.match(context.hljs.highlight("const nexus = true;", { language: "javascript" }).value, /hljs-keyword/);

for (const file of ["pdf-4.10.38.min.mjs", "pdf-worker-4.10.38.min.mjs"]) {
  assert.ok(statSync(resolve(vendor, file)).size > 300_000, `${file} is unexpectedly small.`);
}

console.log("Vendor smoke passed: Markdown, sanitization, highlighting, and PDF bundles verified.");
