import { useCallback } from 'react';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import { useAsync } from '@/hooks/useAsync';
import { youtubeUrlSchema } from '@/utils/validation';
import type { StudyPackage } from '@/types';

export interface YoutubeResult {
  video_id: string;
  title: string;
  duration_seconds: number;
  package: StudyPackage;
}

/** Validates the URL client-side before spending a backend job. */
export function useYoutube() {
  const task = useAsync<YoutubeResult, [string]>(
    useCallback(async (url: string) => {
      const parsed = youtubeUrlSchema.safeParse(url);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Enter a valid YouTube link');
      }
      return api.post<YoutubeResult>(API.youtube.process, { url: parsed.data }, { timeoutMs: 180_000 });
    }, []),
  );
  return task;
}
