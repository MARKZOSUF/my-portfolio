import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';

/** Screen header with an optional back affordance and trailing slot. */
export function HeaderBar({ title, subtitle, showBack = false, trailing }: { title: string; subtitle?: string; showBack?: boolean; trailing?: ReactNode }) {
  const c = useTheme();
  const router = useRouter();
  return (
    <View style={[s.wrap, { borderBottomColor: c.border }]}>
      {showBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={10} onPress={() => router.back()}>
          <Text style={{ color: c.primary, fontWeight: '700' }}>{'\u2190'}</Text>
        </Pressable>
      ) : null}
      <View style={s.titles}>
        <Text variant="title" numberOfLines={1}>{title}</Text>
        {subtitle !== undefined ? <Text variant="caption" muted numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  titles: { flex: 1, gap: 2 },
});
