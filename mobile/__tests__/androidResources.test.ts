import fs from 'fs';
import path from 'path';

/**
 * Guards the Android resource graph.
 *
 * A missing res/ file is not a soft warning: AAPT2 aborts the build with
 * "resource xml/... not found" before Kotlin or JS is touched. That is exactly
 * how @xml/secure_store_backup_rules and @xml/secure_store_data_extraction_rules
 * broke a clean build, so every reference is now verified here.
 */
const ANDROID = path.join(__dirname, '..', 'android');
const RES = path.join(ANDROID, 'app', 'src', 'main', 'res');

/** Resource types the Android SDK / AppCompat provides for us. */
const FRAMEWORK_PREFIXES = ['abc_', 'Theme.AppCompat', 'android:'];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

/** Every resource the project itself defines, as "type/name" keys. */
function definedResources(): Set<string> {
  const defined = new Set<string>();
  for (const file of walk(RES)) {
    const folder = path.basename(path.dirname(file)).split('-')[0];
    if (folder === 'values') {
      const xml = fs.readFileSync(file, 'utf8');
      const tag = /<(string|color|style|bool|integer|dimen|string-array|integer-array)\s+name="([^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = tag.exec(xml))) {
        const type = m[1].endsWith('-array') ? 'array' : m[1];
        defined.add(`${type}/${m[2]}`);
      }
    } else {
      defined.add(`${folder}/${path.parse(file).name}`);
    }
  }
  return defined;
}

describe('android resource references', () => {
  const defined = definedResources();

  const sources = walk(path.join(ANDROID, 'app', 'src')).filter((f) => f.endsWith('.xml'));

  it('finds the android source tree', () => {
    expect(sources.length).toBeGreaterThan(0);
    expect(defined.size).toBeGreaterThan(0);
  });

  it('resolves every @type/name reference to a real resource', () => {
    const missing: string[] = [];
    for (const file of sources) {
      const text = fs.readFileSync(file, 'utf8');
      const ref = /@(\+?)(xml|drawable|mipmap|color|string|style|array|bool|integer|dimen|raw|font)\/([A-Za-z0-9_.]+)/g;
      let m: RegExpExecArray | null;
      while ((m = ref.exec(text))) {
        const [, plus, type, name] = m;
        if (plus) continue;
        if (FRAMEWORK_PREFIXES.some((p) => name.startsWith(p))) continue;
        if (!defined.has(`${type}/${name}`)) {
          missing.push(`@${type}/${name} (referenced by ${path.relative(ANDROID, file)})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('ships the expo-secure-store backup rules the manifest requires', () => {
    const manifest = fs.readFileSync(
      path.join(ANDROID, 'app', 'src', 'main', 'AndroidManifest.xml'),
      'utf8',
    );
    expect(manifest).toContain('@xml/secure_store_backup_rules');
    expect(manifest).toContain('@xml/secure_store_data_extraction_rules');

    for (const name of ['secure_store_backup_rules', 'secure_store_data_extraction_rules']) {
      const file = path.join(RES, 'xml', `${name}.xml`);
      expect(fs.existsSync(file)).toBe(true);
      // SecureStore ciphertext must never ride along in a cloud backup.
      expect(fs.readFileSync(file, 'utf8')).toContain('SecureStore');
    }
  });

  it('keeps the committed debug keystore that build.gradle points at', () => {
    expect(fs.existsSync(path.join(ANDROID, 'app', 'debug.keystore'))).toBe(true);
  });
});
