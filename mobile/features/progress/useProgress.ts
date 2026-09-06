import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import type { BarDatum } from '@/components/charts/BarChart';

interface ProgressRow {
  topic: string;
  mastery: number;
  confidence: number;
  mistakes: Array<Record<string, unknown>>;
  last_reviewed_at: string | null;
}

export function useProgress() {
  return useQuery({
    queryKey: ['progress'],
    queryFn: async () => {
      const data = await api.get<{ items: ProgressRow[] }>(API.learning.progress);
      const rows = data.items;
      const weakest: BarDatum[] = [...rows]
        .sort((a, b) => a.mastery - b.mastery)
        .slice(0, 8)
        .map((r) => ({ label: r.topic, value: r.mastery, emphasis: r.mastery < 0.35 }));
      const averageMastery = rows.length === 0 ? 0 : rows.reduce((sum, r) => sum + r.mastery, 0) / rows.length;
      return { rows, weakest, averageMastery, topicCount: rows.length };
    },
    staleTime: 60_000,
  });
}
