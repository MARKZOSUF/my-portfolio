/**
 * Static release-configuration regression tests (P0 5.3, 5.4, 5.5, 5.7).
 *
 * These run without an Android SDK and guard the exact defects found in the
 * original scan: cleartext traffic, excess permissions, debug-signed releases
 * and the expo.modules.kotlin.types.AnyTypeCache startup crash.
 */
import fs from 'fs';
import path from 'path';

const android = path.resolve(__dirname, '..', 'android');
const read = (rel: string) => fs.readFileSync(path.join(android, rel), 'utf8');

describe('release AndroidManifest', () => {
  const manifest = read('app/src/main/AndroidManifest.xml');

  it('does not enable cleartext traffic', () => {
    expect(manifest).not.toContain('usesCleartextTraffic="true"');
  });

  it('does not request storage or overlay permissions', () => {
    expect(manifest).not.toContain('READ_EXTERNAL_STORAGE');
    expect(manifest).not.toContain('WRITE_EXTERNAL_STORAGE');
    expect(manifest).not.toContain('SYSTEM_ALERT_WINDOW');
  });

  it('applies the strict network security configuration', () => {
    expect(manifest).toContain('android:networkSecurityConfig="@xml/network_security_config"');
    expect(read('app/src/main/res/xml/network_security_config.xml')).toContain(
      'cleartextTrafficPermitted="false"',
    );
  });
});

describe('debug-only overrides', () => {
  it('keeps local HTTP in the debug source set only', () => {
    const debugConfig = read('app/src/debug/res/xml/network_security_config.xml');
    expect(debugConfig).toContain('10.0.2.2');
    expect(debugConfig).toContain('cleartextTrafficPermitted="true"');
  });
});

describe('release signing', () => {
  const gradle = read('app/build.gradle');

  it('never signs a release with the debug keystore', () => {
    expect(gradle).not.toContain('signingConfig signingConfigs.debug\n            minifyEnabled');
    const releaseBlock = gradle.slice(gradle.indexOf('release {'), gradle.indexOf('release {') + 900);
    expect(releaseBlock).not.toContain('signingConfigs.debug');
    expect(releaseBlock).toContain('signingConfigs.release');
  });

  it('reads the upload key from an untracked properties file', () => {
    expect(gradle).toContain('keystore.properties');
    expect(gradle).toContain('STUDYFORGE_UPLOAD_STORE_FILE');
    expect(gradle).toContain('Release signing is not configured.');
  });

  it('contains no hardcoded release password', () => {
    expect(gradle).not.toMatch(/storePassword\s+'(?!android')/);
  });
});

describe('startup regression guard (expo.modules.kotlin.types.AnyTypeCache)', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'),
  ) as { dependencies: Record<string, string> };

  it('keeps the Expo module versions aligned with the SDK', () => {
    // The AnyTypeCache NoClassDefFoundError was caused by mixing an
    // expo-modules-core build with mismatched Expo/Reanimated/Worklets versions.
    expect(pkg.dependencies.expo).toMatch(/^~?54\./);
    expect(pkg.dependencies['expo-modules-core']).toMatch(/^\^?3\.0\./);
    expect(pkg.dependencies['react-native-reanimated']).toMatch(/^~?4\.1\./);
    expect(pkg.dependencies['react-native-worklets']).toBeDefined();
    expect(pkg.dependencies.react).toBe(pkg.dependencies['react-dom']);
  });

  it('does not disable dependency resolution safety', () => {
    const npmrcPath = path.resolve(__dirname, '..', '.npmrc');
    if (fs.existsSync(npmrcPath)) {
      const npmrc = fs.readFileSync(npmrcPath, 'utf8');
      expect(npmrc).not.toContain('legacy-peer-deps=true');
      expect(npmrc).not.toContain('force=true');
    }
  });
});
