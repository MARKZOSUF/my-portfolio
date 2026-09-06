/**
 * Metro config for Expo SDK 54.
 * Extends the Expo default and registers the extra asset types this app bundles:
 *  - .svg  : vector assets shipped with feature screens
 *  - .db   : pre-seeded SQLite databases (expo-sqlite)
 *  - .bin  : model / tokenizer blobs used by on-device helpers
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const extraAssetExts = ['svg', 'db', 'bin'];
for (const ext of extraAssetExts) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}

// Never treat these as source files; they are assets.
config.resolver.sourceExts = config.resolver.sourceExts.filter((ext) => !extraAssetExts.includes(ext));

module.exports = config;
