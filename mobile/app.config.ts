import base from './app.json';

/**
 * Expo config. `extra` is the single source of runtime configuration read by
 * constants/config.ts. Only public values belong here: everything in `extra`
 * ships inside the APK/AAB.
 */
export default ({ config }: { config: Record<string, unknown> }) => ({
  ...base.expo,
  ...config,
  extra: {
    ...base.expo.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? base.expo.extra.apiUrl,
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  },
});
