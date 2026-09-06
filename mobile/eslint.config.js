// ESLint 9 flat config. ESLint 9 no longer reads .eslintrc.js, so this file
// replaces it; eslint-config-expo v10 ships a flat preset for exactly this.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'dist/*',
      'android/*',
      'ios/*',
      '.expo/*',
      'node_modules/*',
    ],
  },
];
