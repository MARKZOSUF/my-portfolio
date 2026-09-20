/**
 * QR payload contract test.
 *
 * Bundles the real source modules with the project's own Vite toolchain (no
 * extra dependency) and exercises them in Node, so these assertions run against
 * the code that actually ships — not a copy.
 *
 * Guarantees under test:
 *   - Image-to-QR never encodes a data:image/...;base64 payload.
 *   - Every QR the app produces for a phone camera is an absolute HTTPS URL.
 *   - Prank links point at the canonical deployed origin and round-trip safely.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const failures = [];
const notes = [];
const check = (label, condition, detail = '') => {
  if (condition) notes.push(`  PASS  ${label}`);
  else failures.push(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
};

const dir = mkdtempSync(join(tmpdir(), 'zosuf-test-'));
const entry = join(dir, 'entry.ts');
writeFileSync(
  entry,
  `export * from ${JSON.stringify(join(process.cwd(), 'src/utils/qrPayloads.ts'))};
   export { encodePrankPayload, decodePrankPayload, SAFE_PRANK_TEMPLATES } from ${JSON.stringify(join(process.cwd(), 'src/utils/safePrankEncoder.ts'))};
   export { siteConfig } from ${JSON.stringify(join(process.cwd(), 'src/config/site.ts'))};
   export { enforceQRMinimums, repairQRConfig, qrContrastRatio } from ${JSON.stringify(join(process.cwd(), 'src/utils/qrSafety.ts'))};`
);

const output = await build({
  logLevel: 'silent',
  configFile: false,
  publicDir: false,
  build: {
    outDir: dir,
    emptyOutDir: false,
    ssr: true,
    lib: { entry, formats: ['es'] },
  },
});

const emitted = []
  .concat(output)
  .flatMap((bundle) => bundle.output || [])
  .find((chunk) => chunk.isEntry);
if (!emitted) throw new Error('Test bundle was not emitted.');

const mod = await import(pathToFileURL(join(dir, emitted.fileName)).href);

try {
  const {
    siteConfig,
    buildSiteLinkPayload,
    isPhoneScannableLink,
    isUnscannablePayload,
    sanitizeWebUrl,
    encodePrankPayload,
    decodePrankPayload,
    SAFE_PRANK_TEMPLATES,
    enforceQRMinimums,
    repairQRConfig,
  } = mod;

  // ---------------------------------------------- 1. the image-to-QR payload
  const imagePayload = buildSiteLinkPayload(siteConfig.productionUrl);
  check('Image-to-QR encodes the production HTTPS URL', imagePayload === 'https://markzosuf.pages.dev', imagePayload);
  check('Image-to-QR payload is phone-scannable', isPhoneScannableLink(imagePayload));
  check('Image-to-QR payload is not a data URI', !isUnscannablePayload(imagePayload));
  check('Image-to-QR payload fits any QR version', new TextEncoder().encode(imagePayload).length < 100);

  // ---------------------------------------------- 2. data: URIs are rejected
  const dataUri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ';
  check('data: URI flagged as unscannable', isUnscannablePayload(dataUri));
  check('data: URI is not a scannable link', !isPhoneScannableLink(dataUri));
  check('sanitizeWebUrl rejects data:', sanitizeWebUrl(dataUri).isValid === false);
  for (const scheme of ['javascript:alert(1)', 'vbscript:x', 'file:///etc/passwd']) {
    check(`sanitizeWebUrl rejects ${scheme.split(':')[0]}:`, sanitizeWebUrl(scheme).isValid === false);
  }
  check('sanitizeWebUrl upgrades a bare host to https', sanitizeWebUrl('markzosuf.pages.dev').sanitized.startsWith('https://'));

  // ---------------------------------------------- 3. prank link round-trip
  const original = {
    v: 1,
    t: 'riddle',
    th: 'neon-mystery',
    to: 'Aarav',
    from: 'Zoya',
    title: 'A Brain Teaser For You',
    msg: 'Riddle: What gets wetter the more it dries?\n\nAnswer: A towel!',
    emoji: '💡',
    confetti: true,
  };
  const { url, encodedData, isTooLong } = encodePrankPayload(original);

  check('prank URL uses the canonical deployed origin', url.startsWith('https://markzosuf.pages.dev/p?d='), url.slice(0, 60));
  check('prank URL is a valid absolute HTTPS link', isPhoneScannableLink(url));
  check('prank URL is short enough to scan reliably', !isTooLong && url.length < 1200, `${url.length} chars`);
  check('prank payload is URL-safe base64', /^[A-Za-z0-9_-]+$/.test(encodedData));

  const roundTrip = decodePrankPayload(encodedData);
  check('prank payload decodes', roundTrip.success === true, roundTrip.error || '');
  check('prank message survives the round-trip', roundTrip.data?.msg === original.msg);
  check('prank recipient survives the round-trip', roundTrip.data?.to === 'Aarav');
  check('prank emoji survives the round-trip', roundTrip.data?.emoji === '💡');

  // Decoding what a real scanner would hand back from the URL itself.
  const fromScannedUrl = decodePrankPayload(new URL(url).searchParams.get('d'));
  check('a scanned prank URL decodes end-to-end', fromScannedUrl.success === true);

  check('tampered prank payload fails safely', decodePrankPayload('!!!not-base64!!!').success === false);
  check('empty prank payload fails safely', decodePrankPayload('').success === false);
  check(
    'unknown template falls back instead of throwing',
    decodePrankPayload(
      Buffer.from(JSON.stringify({ v: 1, t: 'not-a-real-template' })).toString('base64url')
    ).data?.t === 'custom-surprise'
  );
  check('every prank template round-trips', SAFE_PRANK_TEMPLATES.every((tpl) => {
    const encoded = encodePrankPayload({ v: 1, t: tpl.id, title: tpl.defaultTitle, msg: tpl.defaultMsg, emoji: tpl.defaultEmoji });
    const decoded = decodePrankPayload(encoded.encodedData);
    return decoded.success && decoded.data.t === tpl.id && !encoded.isTooLong;
  }));

  // ---------------------------------------------- 4. designs are preserved
  const branded = {
    size: 512, margin: 24, fgColor: '#4c1d95', bgColor: '#ffffff', transparentBg: false,
    gradientType: 'linear', gradientColor2: '#db2777', gradientRotation: 45,
    dotType: 'rounded', cornerSquareType: 'extra-rounded', cornerDotType: 'dot',
    cornerSquareColor: '#db2777', cornerDotColor: '#4c1d95',
    errorCorrection: 'Q', logoDataUrl: 'data:image/png;base64,AAA', logoSize: 0.9, logoMargin: 8,
    frameStyle: 'neon-border', frameLabel: 'SCAN ME', frameColor: '#7c3aed', frameTextColor: '#ffffff',
  };
  const kept = enforceQRMinimums(branded);
  check('dot shape is preserved', kept.dotType === 'rounded');
  check('corner shapes are preserved', kept.cornerSquareType === 'extra-rounded' && kept.cornerDotType === 'dot');
  check('gradient is preserved', kept.gradientType === 'linear' && kept.gradientColor2 === '#db2777');
  check('brand colours are preserved', kept.fgColor === '#4c1d95' && kept.cornerSquareColor === '#db2777');
  check('error-correction choice is preserved', kept.errorCorrection === 'Q');
  check('frame and label are preserved', kept.frameStyle === 'neon-border' && kept.frameLabel === 'SCAN ME');
  check('an oversized logo is capped to what the EC level tolerates', kept.logoSize <= 0.2 && kept.logoSize > 0, String(kept.logoSize));

  const invisible = { ...branded, fgColor: '#fefefe', bgColor: '#ffffff', gradientType: 'none' };
  check('an undecodable palette is corrected', enforceQRMinimums(invisible).fgColor !== '#fefefe');

  const repaired = repairQRConfig(branded);
  check('the repair profile flattens to squares', repaired.dotType === 'square' && repaired.errorCorrection === 'H');
  check('the repair profile keeps the frame design', repaired.frameStyle === 'neon-border' && repaired.frameLabel === 'SCAN ME');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(notes.join('\n'));
if (failures.length) {
  console.error(`\nQR payload test FAILED (${failures.length}):`);
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`\nQR payload test passed: ${notes.length} assertions.`);
