import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/useTheme';
import { relativeTime } from '@/utils/dates';
import type { Flashcard } from '@/types';

/** SM-2 grades surfaced to the learner. */
export const REVIEW_GRADES = [
  { quality: 1, label: 'Again' },
  { quality: 3, label: 'Hard' },
  { quality: 4, label: 'Good' },
  { quality: 5, label: 'Easy' },
] as const;

export function FlashcardTile({ card, onReview }: { card: Flashcard; onReview?: (quality: number) => void | Promise<void> }) {
  const [revealed, setRevealed] = useState(false);
  const c = useTheme();
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={revealed ? 'Hide answer' : 'Reveal answer'}
        onPress={() => setRevealed((v) => !v)}
        style={s.face}
      >
        <Text variant="caption" muted>{revealed ? 'Answer' : 'Question'}</Text>
        <Text variant="subtitle">{revealed ? card.back : card.front}</Text>
        {!revealed ? <Text variant="caption" style={{ color: c.primary }}>Tap to reveal</Text> : null}
      </Pressable>
      <Text variant="caption" muted>Due {relativeTime(card.dueAt)} \u00b7 interval {card.intervalDays}d \u00b7 ease {card.ease.toFixed(2)}</Text>
      {revealed && onReview !== undefined ? (
        <View style={s.grades}>
          {REVIEW_GRADES.map((g) => (
            <View key={g.quality} style={s.grade}>
              <Button
                label={g.label}
                variant={g.quality <= 1 ? 'danger' : g.quality >= 5 ? 'primary' : 'secondary'}
                onPress={async () => {
                  await onReview(g.quality);
                  setRevealed(false);
                }}
              />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  face: { gap: 6, minHeight: 96, justifyContent: 'center' },
  grades: { flexDirection: 'row', gap: 8 },
  grade: { flex: 1 },
});
