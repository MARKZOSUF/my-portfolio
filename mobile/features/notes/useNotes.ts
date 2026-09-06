import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { API, config } from '@/constants/config';
import { cacheGet, cacheSet } from '@/services/storage/offlineDb';
import type { Note } from '@/types';

interface NoteListResponse {
  items: Note[];
  next_cursor: string | null;
}

/** Paged note list with an offline snapshot fallback. */
export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      try {
        const data = await api.get<NoteListResponse>(`${API.notes.list}?limit=${config.pageSize}`);
        await cacheSet('notes', data.items);
        return data.items;
      } catch (error) {
        const cached = await cacheGet<Note[]>('notes');
        if (cached) return cached.map((n) => ({ ...n, cached: true }));
        throw error;
      }
    },
    staleTime: 30_000,
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: ['note', id],
    queryFn: () => api.get<Note>(API.notes.detail(id)),
    enabled: id.length > 0,
  });
}

export function useDeleteNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(API.notes.detail(id)),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['notes'] });
    },
  });
}
