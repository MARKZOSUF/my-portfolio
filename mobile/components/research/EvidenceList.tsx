import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';
import { truncate } from '@/utils/format';

export interface EvidenceEntry {
  marker: string;
  label: string;
  url: string;
  publisher?: string;
  verified?: boolean;
}

/** Citation list for deep-research reports. Tapping opens the source. */
export function EvidenceList({ entries }: { entries: readonly EvidenceEntry[] }) {
  const c = useTheme();
  if (entries.length === 0) {
    return <Text variant="caption" muted>No citations were produced for this report.</Text>;
  }
  return (
    <Card>
      <Text variant="subtitle">Sources ({entries.length})</Text>
      {entries.map((e) => (
        <Pressable
          key={`${e.marker}-${e.url}`}
          accessibilityRole="link"
          accessibilityLabel={`Open source ${e.marker}: ${e.label}`}
          onPress={() => {
            void Linking.openURL(e.url);
          }}
          style={s.row}
        >
          <Text variant="caption" style={{ color: c.primary, fontWeight: '700' }}>[{e.marker}]</Text>
          <View style={s.body}>
            <Text variant="caption">{truncate(e.label, 90)}</Text>
            <Text variant="caption" muted>
              {e.publisher ?? new URL(e.url).host}
              {e.verified === false ? ' \u00b7 unverified' : ''}
            </Text>
          </View>
        </Pressable>
      ))}
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, minHeight: 44, alignItems: 'flex-start' },
  body: { flex: 1, gap: 2 },
});
