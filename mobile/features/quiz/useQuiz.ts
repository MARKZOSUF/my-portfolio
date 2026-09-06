import { useCallback, useMemo, useState } from 'react';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import { useAsync } from '@/hooks/useAsync';
import type { QuizQuestion } from '@/types';

interface QuizResponse {
  questions: QuizQuestion[];
}

export interface QuizAttemptResult {
  score: number;
  total: number;
  accuracy: number;
}

/** Owns quiz generation, answer selection, scoring and submission. */
export function useQuiz() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);

  const generation = useAsync<QuizResponse, [string, number]>(
    useCallback((topic: string, count: number) => api.post<QuizResponse>(API.quiz.generate, { topic, count }), []),
  );

  const questions = generation.data?.questions ?? [];

  const select = useCallback((questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }, []);

  const result = useMemo<QuizAttemptResult>(() => {
    const total = questions.length;
    let score = 0;
    for (const q of questions) {
      if (answers[q.id] === q.answer) score += 1;
    }
    return { score, total, accuracy: total === 0 ? 0 : score / total };
  }, [questions, answers]);

  const submit = useCallback(
    async (topic: string, durationSeconds: number) => {
      setRevealed(true);
      await api.post(
        API.quiz.attempt,
        {
          topic,
          score: result.score,
          total: result.total,
          duration_seconds: durationSeconds,
          answers: questions.map((q) => ({ question_id: q.id, chosen: answers[q.id] ?? null, correct: answers[q.id] === q.answer })),
        },
        true,
      );
      return result;
    },
    [answers, questions, result],
  );

  const restart = useCallback(() => {
    setAnswers({});
    setRevealed(false);
    generation.reset();
  }, [generation]);

  return {
    questions,
    answers,
    revealed,
    result,
    loading: generation.loading,
    error: generation.error,
    generate: generation.run,
    select,
    submit,
    restart,
  };
}
