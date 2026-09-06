/**
 * Google Sign-In for the StudyForge mobile app.
 *
 * Flow (OAuth 2.0 implicit ID-token flow with PKCE-style nonce binding):
 *
 *   1. Generate a cryptographically random nonce and hash it with SHA-256.
 *   2. Open Google's authorization endpoint in the system browser / Custom Tab
 *      via expo-auth-session, requesting `id_token`.
 *   3. Google redirects back to the app scheme with an ID token bound to the
 *      SHA-256 nonce.
 *   4. POST { id_token, nonce } to the backend, which verifies the RS256
 *      signature, issuer, audience, expiry and nonce against Google's JWKS and
 *      returns a normal StudyForge token pair.
 *
 * The raw nonce never leaves the device except in step 4, so a stolen ID token
 * from another app cannot be replayed against this backend.
 *
 * Nothing secret lives here: an OAuth client ID is public, and the client
 * SECRET is only ever used server-side.
 */
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { googleAuth } from '@/constants/config';

export class GoogleSignInError extends Error {
  readonly code: 'unavailable' | 'cancelled' | 'failed';

  constructor(code: 'unavailable' | 'cancelled' | 'failed', message: string) {
    super(message);
    this.name = 'GoogleSignInError';
    this.code = code;
  }
}

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

/** Completes the browser session on Android after the redirect. */
export function maybeCompleteGoogleAuthSession(): void {
  WebBrowser.maybeCompleteAuthSession();
}

/**
 * The client ID whose redirect URI is registered for this platform. Android and
 * iOS OAuth clients use a reversed-client-id scheme; the web client ID is what
 * Google stamps into the ID token `aud` on Android, so it is the fallback.
 */
export function resolveClientId(platform: string = Platform.OS): string {
  if (platform === 'android' && googleAuth.androidClientId) return googleAuth.androidClientId;
  if (platform === 'ios' && googleAuth.iosClientId) return googleAuth.iosClientId;
  return googleAuth.webClientId;
}

export function isGoogleSignInAvailable(): boolean {
  return googleAuth.enabled && Boolean(resolveClientId());
}

export type GoogleIdTokenResult = { idToken: string; nonce: string };

/**
 * Runs the interactive Google flow and returns the ID token plus the raw nonce.
 * Throws GoogleSignInError('cancelled') when the user dismisses the browser.
 */
export async function requestGoogleIdToken(): Promise<GoogleIdTokenResult> {
  const clientId = resolveClientId();
  if (!clientId) {
    throw new GoogleSignInError(
      'unavailable',
      'Google sign-in is not configured for this build. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ' +
        'and the platform client ID, then rebuild.',
    );
  }

  // 32 random bytes -> hex. The hash is what Google binds into the token.
  const rawNonce = Array.from(await Crypto.getRandomBytesAsync(32))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'ai-notes-maker', path: 'oauth/google' });

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    extraParams: { nonce: hashedNonce, prompt: 'select_account' },
    usePKCE: false,
  });

  const result = await request.promptAsync(DISCOVERY);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new GoogleSignInError('cancelled', 'Google sign-in was cancelled.');
  }
  if (result.type !== 'success') {
    const detail = result.type === 'error' ? result.error?.message : undefined;
    throw new GoogleSignInError('failed', detail || 'Google sign-in did not complete.');
  }

  const idToken = (result.params?.id_token ?? '') as string;
  if (!idToken) {
    throw new GoogleSignInError('failed', 'Google did not return an ID token.');
  }
  return { idToken, nonce: rawNonce };
}
