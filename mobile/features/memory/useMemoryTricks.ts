import { useCallback } from 'react';
import { api } from '@/services/api/client';
import { useAsync } from '@/hooks/useAsync';

export type MnemonicKind = 'acronym' | 'acrostic' | 'story' | 'peg' | 'chunking' | 'visual';

export interface MemoryTrick {
  kind: MnemonicKind;
  title: string;
  device: string;
  explanation: string;
  items: string[];
}

/** Generates mnemonics for a list of hard-to-recall items. */
export function useMemoryTricks() {
  return useAsync<{ tricks: MemoryTrick[] }, [string, readonly string[]]>(
    useCallback(
      (topic: string, items: readonly string[]) =>
        api.post<{ tricks: MemoryTrick[] }>('/generate/memory', { input: topic, items: [...items] }),
      [],
    ),
  );
}
