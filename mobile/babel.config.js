/**
 * Babel config for Expo SDK 54 / React Native 0.81.
 *
 * IMPORTANT: react-native-reanimated/plugin (v4 ships it as react-native-worklets/plugin)
 * MUST be the LAST entry in the plugins array. Without this file Metro bundling fails
 * with "Reanimated: babel plugin was not found" and expo-router route generation breaks.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // expo-router needs the unstable transform for typed routes + async routes.
          'react-compiler': false,
        },
      ],
    ],
    plugins: [
      // Keep this plugin LAST. Reanimated 4 re-exports its plugin from react-native-worklets.
      'react-native-worklets/plugin',
    ],
  };
};
