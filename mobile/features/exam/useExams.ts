import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import { daysBetween } from '@/utils/dates';

export interface ExamRow {
  id: string;
  name: string;
  exam_date: string;
  total_marks: number | null;
}

export interface ExamPrediction {
  topic: string;
  probability: number;
  expected_marks: number;
  reason: string;
}

export function useExams() {
  const client = useQueryClient();

  const list = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const data = await api.get<{ items: ExamRow[] }>(API.exams.list);
      return data.items
        .map((e) => ({ ...e, daysAway: daysBetween(new Date(), e.exam_date) }))
        .sort((a, b) => a.daysAway - b.daysAway);
    },
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: (input: { name: string; examDate: string; totalMarks?: number }) =>
      api.post<ExamRow>(API.exams.list, { name: input.name, exam_date: input.examDate, total_marks: input.totalMarks ?? null }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['exams'] });
    },
  });

  const analyze = useMutation({
    mutationFn: (input: { examId: string }) => api.post<{ patterns: Array<{ topic: string; frequency: number }> }>(API.exams.analyze, input),
  });

  const predict = useMutation({
    mutationFn: (input: { examId: string }) => api.post<{ predictions: ExamPrediction[] }>(API.exams.predict, input),
  });

  return { list, create, analyze, predict };
}
