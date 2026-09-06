/**
 * Google Sign-In client wiring tests.
 *
 * These assert configuration and gating logic only. A real end-to-end OAuth
 * round trip requires a device, a browser and live Google credentials, and is
 * NOT covered here.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const MOBILE = join(__dirname, '..');
const read = (p: string) => readFileSync(join(MOBILE, p), 'utf8');

const service = read('services/auth/googleSignIn.ts');
const provider = read('features/auth/AuthProvider.tsx');
const button = read('features/auth/GoogleSignInButton.tsx');
const config = read('constants/config.ts');
const login = read('app/(auth)/login/index.tsx');
const signup = read('app/(auth)/signup/index.tsx');
const env = read('.env.example');
const pkg = JSON.parse(read('package.json'));

describe('google sign-in service', () => {
  it('requests an ID token, which is what the backend verifies', () => {
    expect(service).toContain('ResponseType.IdToken');
    expect(service).toContain("'openid'");
    expect(service).toContain("'email'");
  });

  it('sends a hashed nonce and returns the raw nonce for replay protection', () => {
    expect(service).toContain('digestStringAsync');
    expect(service).toContain('nonce');
  });

  it('uses the app scheme redirect', () => {
    expect(service).toContain('makeRedirectUri');
    expect(service).toContain('ai-notes-maker');
  });

  it('distinguishes cancellation from real failure', () => {
    expect(service).toContain("'cancelled'");
    expect(service).toContain("'unavailable'");
    expect(service).toContain("'failed'");
  });

  it('never contains a client secret', () => {
    expect(service.toLowerCase()).not.toContain('client_secret');
    expect(service).not.toContain('clientSecret');
  });
});

describe('auth provider', () => {
  it('exposes loginWithGoogle and an availability flag', () => {
    expect(provider).toContain('loginWithGoogle');
    expect(provider).toContain('googleAvailable');
  });

  it('exchanges the ID token with the backend rather than trusting it', () => {
    expect(provider).toContain('API.auth.google');
    expect(provider).toContain('id_token');
  });

  it('persists the returned session tokens', () => {
    expect(provider).toContain('tokenStore.set');
  });

  it('completes the pending auth session at module scope', () => {
    expect(provider).toContain('maybeCompleteGoogleAuthSession()');
  });
});

describe('google button gating', () => {
  it('renders nothing when no client ID is configured', () => {
    expect(button).toContain('if (!googleAvailable) return null');
  });

  it('stays silent on user cancellation', () => {
    expect(button).toContain("e.code === 'cancelled'");
  });

  it('surfaces real failures', () => {
    expect(button).toContain('Alert.alert');
  });

  it('is present on both the login and signup screens', () => {
    expect(login).toContain('GoogleSignInButton');
    expect(signup).toContain('GoogleSignInButton');
  });
});

describe('configuration', () => {
  it('defines the google auth endpoints', () => {
    expect(config).toContain("google: '/auth/google'");
    expect(config).toContain("providers: '/auth/providers'");
  });

  it('reads the public client IDs from the environment', () => {
    expect(config).toContain('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
    expect(config).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  });

  it('documents the client IDs in .env.example', () => {
    expect(env).toContain('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
    expect(env).toContain('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  });

  it('never documents a client secret in the mobile app', () => {
    expect(env).not.toContain('CLIENT_SECRET');
  });

  it('declares the required expo auth dependencies', () => {
    for (const dep of ['expo-auth-session', 'expo-web-browser', 'expo-crypto']) {
      expect(pkg.dependencies[dep]).toBeDefined();
    }
  });
});
