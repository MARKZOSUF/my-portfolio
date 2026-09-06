import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';

export interface RevisionRecommendation {
  topic: string;
  mastery: number;
  confidence: number;
  priority: number;
}

export interface RevisionPayload {
  due_flashcards: number;
  recommendations: RevisionRecommendation[];
}

/** Today's revision queue, ranked by priority (weakest first). */
export function useRevision() {
  return useQuery({
    queryKey: ['revision'],
    queryFn: async () => {
      const data = await api.get<RevisionPayload>(API.revision.recommendations);
      return {
        dueFlashcards: data.due_flashcards,
        recommendations: [...data.recommendations].sort((a, b) => b.priority - a.priority),
      };
    },
    staleTime: 60_000,
  });
}
