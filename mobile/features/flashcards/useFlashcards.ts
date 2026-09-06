import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import type { Flashcard } from '@/types';

interface GenerateResponse {
  cards: Array<{ id: string; front: string; back: string; due_at: string; interval_days: number; ease: number; bookmarked: boolean }>;
}

function toFlashcard(raw: GenerateResponse['cards'][number]): Flashcard {
  return {
    id: raw.id,
    front: raw.front,
    back: raw.back,
    dueAt: raw.due_at,
    intervalDays: raw.interval_days,
    ease: raw.ease,
    bookmarked: raw.bookmarked,
  };
}

export function useDueFlashcards() {
  return useQuery({
    queryKey: ['flashcards', 'due'],
    queryFn: async () => (await api.get<GenerateResponse>(API.revision.due)).cards.map(toFlashcard),
    staleTime: 30_000,
  });
}

export function useFlashcards() {
  const client = useQueryClient();

  const generate = useMutation({
    mutationFn: async (input: { topic: string; count: number }) =>
      (await api.post<GenerateResponse>(API.flashcards.generate, input)).cards.map(toFlashcard),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['flashcards'] });
    },
  });

  const review = useMutation({
    mutationFn: (input: { id: string; quality: number }) =>
      api.post<{ due_at: string; interval_days: number; ease: number }>(API.flashcards.review(input.id), { quality: input.quality }, true),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['flashcards', 'due'] });
    },
  });

  const reviewCard = useCallback(
    async (id: string, quality: number) => {
      await review.mutateAsync({ id, quality });
    },
    [review],
  );

  return { generate, review, reviewCard };
}
