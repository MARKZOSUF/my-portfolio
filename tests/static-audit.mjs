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
console.log(`Static API-free audit passed: ${requiredFiles.length} core files, 60+ templates and 40+ frames verified.`);
