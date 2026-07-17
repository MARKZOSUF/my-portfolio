# AI NEXUS Native Wrapper

This folder documents the Capacitor wrapper included in V9.3 Plus.

## Android

```powershell
npm install
npm run mobile:add:android
npm run mobile:sync
npm run mobile:open:android
```

Android Studio will open. Use **Build → Generate App Bundles or APKs**.

## iOS

iOS compilation requires macOS and Xcode.

```bash
npm install
npm run mobile:add:ios
npm run mobile:sync
npm run mobile:open:ios
```

## Important

The native wrapper loads the production website:

`https://markzosuf.pages.dev`

Change `server.url` in `capacitor.config.json` when using another domain.
The ZIP contains source configuration, not a signed APK, AAB or IPA binary.
