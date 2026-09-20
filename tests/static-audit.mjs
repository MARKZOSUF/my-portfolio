import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const requiredFiles = [
  'src/features/qr/QRGenerator.tsx',
  'src/features/qr/StudioLivePreview.tsx',
  'src/features/qr/tabs/TemplatesTab.tsx',
  'src/features/qr/tabs/FramesTab.tsx',
  'src/features/qr/tabs/LogoTab.tsx',
  'src/features/qr/tabs/ExportTab.tsx',
  'src/features/qr/data/templatesData.ts',
  'src/features/qr/data/framesData.ts',
  'public/sw.js',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ${file}`);
}

if (fs.existsSync('functions')) failures.push('API/Functions directory must not exist');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const dependency of ['@google/genai', 'express', 'dotenv', 'canvas-confetti', 'motion']) {
  if (pkg.dependencies?.[dependency] || pkg.devDependencies?.[dependency]) {
    failures.push(`Forbidden dependency ${dependency}`);
  }
}

if (!fs.readFileSync('vite.config.ts', 'utf8').includes("outDir: 'web'")) {
  failures.push('Vite output must be web');
}
if (fs.existsSync('public/_redirects')) failures.push('Invalid Cloudflare _redirects must not return');
if (!fs.existsSync('wrangler.toml') || !fs.readFileSync('wrangler.toml', 'utf8').includes('pages_build_output_dir = "./web"')) {
  failures.push('Missing Cloudflare Pages output configuration');
}

const imageTool = fs.readFileSync('src/features/images/ImageToQR.tsx', 'utf8');
if (!imageTool.includes('QR_BYTE_CAPACITY[designConfig.errorCorrection]')) {
  failures.push('Image QR ignores selected error correction');
}
// Requirement: the image tool must encode a real HTTPS link, never base64 image data.
if (!imageTool.includes('buildSiteLinkPayload(siteConfig.productionUrl)')) {
  failures.push('Image QR no longer encodes the canonical production HTTPS URL');
}
if (!imageTool.includes('isPhoneScannableLink')) {
  failures.push('Image QR does not guard its payload against unscannable schemes');
}
if (/data:image\/[a-z]+;base64/.test(imageTool.replace(/dataUrl/g, ''))) {
  failures.push('Image QR source references an inline base64 image payload');
}
if (fs.readFileSync('src/config/site.ts', 'utf8').indexOf('https://markzosuf.pages.dev') === -1) {
  failures.push('Production URL is not https://markzosuf.pages.dev');
}

// Requirement: designs, templates, frames and logos must survive rendering.
const safety = fs.readFileSync('src/utils/qrSafety.ts', 'utf8');
if (safety.includes('makeSafeQRConfig')) {
  failures.push('Pre-emptive design flattening (makeSafeQRConfig) has returned');
}
for (const needed of ['enforceQRMinimums', 'repairQRConfig', 'enforceShapesMinimums', 'repairShapesConfig']) {
  if (!safety.includes(`export function ${needed}`)) failures.push(`qrSafety is missing ${needed}`);
}
const renderer = fs.readFileSync('src/features/qr/QRRenderer.tsx', 'utf8');
if (!renderer.includes('isUnscannablePayload')) {
  failures.push('QRRenderer does not block data: payloads');
}
if (!renderer.includes('repairQRConfig')) {
  failures.push('QRRenderer has no scannability fallback path');
}

// Requirement: Cloudflare Pages must work with no API or Worker.
const swSource = fs.readFileSync('public/sw.js', 'utf8');
if (!swSource.includes('__ZOSUF_BUILD_ID__')) {
  failures.push('Service worker has no build-id placeholder — deploys will serve a stale cache');
}
if (!swSource.includes("request.mode === 'navigate'")) {
  failures.push('Service worker does not handle SPA navigations');
}
if (!swSource.includes('url.search')) {
  failures.push('Service worker may cache prank links carrying query data');
}
const headers = fs.readFileSync('public/_headers', 'utf8');
for (const route of ['/qr-scanner', '/prank-qr', '/image-to-qr', '/p']) {
  if (!headers.includes(`\n${route}\n`)) failures.push(`_headers has no cache rule for ${route}`);
}
const fallbackScript = fs.readFileSync('scripts/ensure-pages-fallback.mjs', 'utf8');
if (!fallbackScript.includes('/* /index.html 200')) {
  failures.push('Pages fallback script no longer writes the SPA redirect');
}

// Requirement: typecheck must be strict.
const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
for (const flag of ['strict', 'noUnusedLocals', 'noUnusedParameters']) {
  if (tsconfig.compilerOptions?.[flag] !== true) failures.push(`tsconfig.${flag} must be enabled`);
}

const sourceFiles = fs.readdirSync('src', { recursive: true })
  .filter((file) => /\.(ts|tsx)$/.test(String(file)));
const allSource = sourceFiles
  .map((file) => fs.readFileSync(path.join('src', String(file)), 'utf8'))
  .join('\n');

for (const forbidden of ['/api/', 'VITE_ENABLE_R2_UPLOAD', 'ZOSUF_IMAGES', 'CloudUploadStatus']) {
  if (allSource.includes(forbidden)) failures.push(`API-free source contains ${forbidden}`);
}
for (const forbidden of ['download zip', 'export zip', 'project zip', 'dangerouslysetinnerhtml']) {
  if (allSource.toLowerCase().includes(forbidden)) failures.push(`Forbidden UI/code phrase ${forbidden}`);
}

const templates = fs.readFileSync('src/features/qr/data/templatesData.ts', 'utf8');
if ((templates.match(/id: '/g) || []).length < 60) failures.push('Fewer than 60 template definitions');
const frames = fs.readFileSync('src/features/qr/data/framesData.ts', 'utf8');
if ((frames.match(/id: '/g) || []).length < 40) failures.push('Fewer than 40 frame definitions');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
const templateCount = (templates.match(/id: '/g) || []).length;
const frameCount = (frames.match(/id: '/g) || []).length;
console.log(
  `Static API-free audit passed: ${requiredFiles.length} core files, ${templateCount} templates, ${frameCount} frames, strict TS, no API/Worker.`
);
