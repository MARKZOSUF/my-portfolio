import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';

export interface FormulaVariable {
  symbol: string;
  meaning: string;
  unit?: string;
}

export interface FormulaItem {
  id: string;
  name: string;
  expression: string;
  variables: readonly FormulaVariable[];
  conditions?: string;
  verified?: boolean;
}

export function FormulaCard({ formula }: { formula: FormulaItem }) {
  const c = useTheme();
  return (
    <Card>
      <View style={s.head}>
        <Text variant="subtitle" style={s.flex}>{formula.name}</Text>
        {formula.verified === true ? (
          <Text variant="caption" style={{ color: c.positive, fontWeight: '700' }}>Verified</Text>
        ) : (
          <Text variant="caption" style={{ color: c.attention, fontWeight: '700' }}>Unverified</Text>
        )}
      </View>
      <View style={[s.expr, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={s.mono}>{formula.expression}</Text>
      </View>
      {formula.variables.map((v) => (
        <Text key={v.symbol} variant="caption" muted>
          {v.symbol} = {v.meaning}{v.unit !== undefined ? ` (${v.unit})` : ''}
        </Text>
      ))}
      {formula.conditions !== undefined ? (
        <Text variant="caption" style={{ color: c.attention }}>Valid when: {formula.conditions}</Text>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  expr: { borderWidth: 1, borderRadius: 10, padding: 12 },
  mono: { fontFamily: 'monospace', fontSize: 16 },
});
