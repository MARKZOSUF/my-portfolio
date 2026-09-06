import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';
import { formatPercent } from '@/utils/format';

export interface BarDatum {
  label: string;
  /** Normalised 0..1 */
  value: number;
  emphasis?: boolean;
}

/** Dependency-free horizontal bar chart used for weak topics / mastery. */
export function BarChart({ data, max = 1 }: { data: readonly BarDatum[]; max?: number }) {
  const c = useTheme();
  const safeMax = max > 0 ? max : 1;
  if (data.length === 0) {
    return <Text variant="caption" muted>No data yet.</Text>;
  }
  return (
    <View style={s.wrap} accessibilityRole="summary">
      {data.map((d) => {
        const ratio = Math.max(0, Math.min(1, d.value / safeMax));
        return (
          <View key={d.label} style={s.row} accessibilityLabel={`${d.label}: ${formatPercent(ratio)}`}>
            <Text variant="caption" numberOfLines={1} style={s.label}>{d.label}</Text>
            <View style={[s.track, { backgroundColor: c.border }]}>
              <View style={[s.fill, { width: `${ratio * 100}%`, backgroundColor: d.emphasis === true ? c.danger : c.primary }]} />
            </View>
            <Text variant="caption" muted style={s.value}>{formatPercent(ratio)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 96 },
  track: { flex: 1, height: 10, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  value: { width: 42, textAlign: 'right' },
});
