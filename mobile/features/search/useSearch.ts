import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchHit {
  id: string;
  kind: 'note' | 'document' | 'flashcard' | 'question';
  title: string;
  snippet: string;
  score: number;
}

/** Debounced hybrid search. Queries shorter than 2 chars are not sent. */
export function useSearch(rawQuery: string) {
  const query = useDebounce(rawQuery.trim(), 350);
  const enabled = query.length >= 2;
  const result = useQuery({
    queryKey: ['search', query],
    queryFn: async () => (await api.get<{ items: SearchHit[] }>(`${API.search.query}?q=${encodeURIComponent(query)}`)).items,
    enabled,
    staleTime: 30_000,
  });
  return { ...result, query, enabled };
}
