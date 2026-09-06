import { StyleSheet, View, Pressable } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/useTheme';
import type { QuizQuestion } from '@/types';

/** One quiz question. Controlled: the parent owns the selection. */
export function QuestionCard({
  question,
  index,
  total,
  selected,
  revealed = false,
  onSelect,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  selected?: string;
  revealed?: boolean;
  onSelect?: (value: string) => void;
}) {
  const c = useTheme();
  const options = question.options ?? [];
  return (
    <Card>
      <Text variant="caption" muted>Question {index + 1} of {total} \u00b7 {question.difficulty}</Text>
      <Text variant="subtitle">{question.prompt}</Text>
      {options.map((option) => {
        const isChosen = selected === option;
        const isAnswer = question.answer === option;
        const background = revealed
          ? isAnswer
            ? c.positiveSoft
            : isChosen
              ? c.dangerSoft
              : c.surface
          : isChosen
            ? c.primarySoft
            : c.surface;
        const border = revealed ? (isAnswer ? c.positive : isChosen ? c.danger : c.border) : isChosen ? c.primary : c.border;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: isChosen }}
            disabled={revealed || onSelect === undefined}
            onPress={() => onSelect?.(option)}
            style={[s.option, { backgroundColor: background, borderColor: border }]}
          >
            <Text>{option}</Text>
          </Pressable>
        );
      })}
      {revealed ? (
        <View style={s.explain}>
          <Text variant="caption" style={{ fontWeight: '700' }}>Answer</Text>
          <Text variant="caption">{question.answer}</Text>
          <Text variant="caption" muted>{question.explanation}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const s = StyleSheet.create({
  option: { borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 48, justifyContent: 'center' },
  explain: { gap: 4 },
});
