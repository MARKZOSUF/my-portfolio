#!/usr/bin/env node
/**
 * `npm run config:check`
 *
 * Validates the mobile configuration using the same rules the app enforces at
 * runtime: production requires a public HTTPS API URL, and no EXPO_PUBLIC_*
 * variable may look like a secret (those values ship inside the APK/AAB).
 */
const fs = require('fs');
const path = require('path');

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[?::1\]?$|.*\.local$)/i;
const SECRET_TOKENS = ['SECRET', 'PASSWORD', 'PRIVATE_KEY', 'API_KEY'];

function readEnv(file) {
  if (!fs.existsSync(file)) return null;
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    out[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return out;
}

function check(file, production) {
  const env = readEnv(file);
  const errors = [];
  const warnings = [];
  if (!env) {
    warnings.push(`${file} not found (copy ${file}.example)`);
    return { errors, warnings };
  }
  const url = (env.EXPO_PUBLIC_API_URL || '').trim();
  if (!url) {
    errors.push(`${file}: EXPO_PUBLIC_API_URL is missing`);
  } else {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      errors.push(`${file}: EXPO_PUBLIC_API_URL is not a valid URL`);
    }
    if (parsed && production) {
      if (parsed.protocol !== 'https:') errors.push(`${file}: production API URL must use HTTPS`);
      if (PRIVATE_HOST.test(parsed.hostname)) {
        errors.push(`${file}: production API URL must not point at ${parsed.hostname}`);
      }
    }
  }
  for (const name of Object.keys(env)) {
    if (name.startsWith('EXPO_PUBLIC_') && SECRET_TOKENS.some((t) => name.includes(t))) {
      errors.push(`${file}: ${name} looks like a secret and would ship inside the app bundle`);
    }
  }
  return { errors, warnings };
}

const root = path.resolve(__dirname, '..');
const results = [
  check(path.join(root, '.env'), false),
  check(path.join(root, '.env.production'), true),
];
const errors = results.flatMap((r) => r.errors);
const warnings = results.flatMap((r) => r.warnings);

console.log('StudyForge AI mobile configuration check');
warnings.forEach((w) => console.log(`  WARN  ${w}`));
errors.forEach((e) => console.log(`  ERROR ${e}`));
if (errors.length) {
  console.log(`\nFAILED: ${errors.length} blocking problem(s).`);
  process.exit(1);
}
console.log('\nOK: mobile configuration is valid.');
