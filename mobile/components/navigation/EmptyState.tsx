import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

/** Shared empty/zero-data placeholder. */
export function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={s.wrap}>
      <Text variant="subtitle">{title}</Text>
      <Text muted style={s.center}>{body}</Text>
      {actionLabel !== undefined && onAction !== undefined ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  center: { textAlign: 'center' },
});
