/**
 * Google sign-in button.
 *
 * Renders nothing when the build has no Google OAuth client ID configured, so
 * the app never shows a control that cannot possibly work. A user cancellation
 * is silent; every other failure surfaces an actionable alert.
 */
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { GoogleSignInError } from '@/services/auth/googleSignIn';
import { useTheme } from '@/theme/useTheme';

export function GoogleSignInButton({ label = 'Continue with Google' }: { label?: string }) {
  const c = useTheme();
  const { googleAvailable, loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!googleAvailable) return null;

  async function run() {
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      if (e instanceof GoogleSignInError && e.code === 'cancelled') return;
      Alert.alert(
        'Google sign-in failed',
        e instanceof Error ? e.message : 'Try again, or sign in with your email and password.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 12 }}>
      <View style={s.divider}>
        <View style={[s.rule, { backgroundColor: c.border }]} />
        <Text muted style={{ fontSize: 12 }}>
          or
        </Text>
        <View style={[s.rule, { backgroundColor: c.border }]} />
      </View>
      <Button
        label={label}
        variant="secondary"
        loading={busy}
        onPress={run}
        icon={<Ionicons name="logo-google" size={18} color={c.text} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
});
