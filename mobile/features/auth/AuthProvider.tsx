import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { api } from '@/services/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
import { API } from '@/constants/config';
import {
  GoogleSignInError,
  isGoogleSignInAvailable,
  maybeCompleteGoogleAuthSession,
  requestGoogleIdToken,
} from '@/services/auth/googleSignIn';
import type { User } from '@/types';

type TokenPair = { access_token: string; refresh_token: string; user: User };

type AuthValue = {
  user?: User;
  loading: boolean;
  /** True only when this build has a usable Google OAuth client ID. */
  googleAvailable: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (displayName: string, email: string, password: string) => Promise<void>;
  /** Runs the real Google flow, then exchanges the ID token for a session. */
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const C = createContext<AuthValue | undefined>(undefined);

// Required on Android so the Custom Tab redirect resolves the pending session.
maybeCompleteGoogleAuthSession();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);
  const googleAvailable = isGoogleSignInAvailable();

  useEffect(() => {
    tokenStore
      .getAccess()
      .then((t) => (t ? api.get<User>('/users/me').then(setUser).catch(() => tokenStore.clear()) : undefined))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      googleAvailable,
      async login(email, password) {
        const t = await api.post<TokenPair>(API.auth.login, { email, password });
        await tokenStore.set(t.access_token, t.refresh_token);
        setUser(t.user);
        router.replace('/(main)/dashboard');
      },
      async signup(display_name, email, password) {
        const t = await api.post<TokenPair>(API.auth.signup, { display_name, email, password });
        await tokenStore.set(t.access_token, t.refresh_token);
        setUser(t.user);
        router.replace('/(auth)/onboarding');
      },
      async loginWithGoogle() {
        if (!googleAvailable) {
          throw new GoogleSignInError(
            'unavailable',
            'Google sign-in is not configured for this build.',
          );
        }
        // Step 1: interactive Google flow -> ID token + raw nonce.
        const { idToken, nonce } = await requestGoogleIdToken();
        // Step 2: the backend verifies the token; the app never trusts it itself.
        const t = await api.post<TokenPair>(API.auth.google, {
          id_token: idToken,
          nonce,
        });
        await tokenStore.set(t.access_token, t.refresh_token);
        setUser(t.user);
        // A brand-new Google account still has no study profile, so send first
        // time users through onboarding and returning users to the dashboard.
        const isNew = !(t.user as User & { onboarded?: boolean }).onboarded;
        router.replace(isNew ? '/(auth)/onboarding' : '/(main)/dashboard');
      },
      async logout() {
        await tokenStore.clear();
        setUser(undefined);
        router.replace('/(auth)/login');
      },
    }),
    [user, loading, googleAvailable],
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useAuth() {
  const v = useContext(C);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
}
