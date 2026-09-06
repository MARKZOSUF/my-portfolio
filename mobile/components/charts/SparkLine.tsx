import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

/** Compact column sparkline for streaks and daily activity. */
export function SparkLine({ points, height = 40 }: { points: readonly number[]; height?: number }) {
  const c = useTheme();
  const max = points.reduce((acc, p) => (p > acc ? p : acc), 0);
  const safeMax = max > 0 ? max : 1;
  return (
    <View style={[s.wrap, { height }]} accessibilityRole="image" accessibilityLabel={`Trend over ${points.length} days`}>
      {points.map((p, i) => (
        <View
          key={`${i}-${p}`}
          style={[s.bar, { height: Math.max(2, (p / safeMax) * height), backgroundColor: p > 0 ? c.primary : c.border }]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { flex: 1, borderRadius: 3, minWidth: 3 },
});
