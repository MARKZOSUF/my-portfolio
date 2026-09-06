import { useCallback, useState } from 'react';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import { toMessage } from '@/utils/errors';
import type { EvidenceEntry } from '@/components/research/EvidenceList';

export interface ResearchReport {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  report: string | null;
  citations: EvidenceEntry[];
  conflicts: Array<{ claim_a: string; claim_b: string; reason: string }>;
}

/** Starts a deep-research run and polls until it settles. */
export function useResearch() {
  const [report, setReport] = useState<ResearchReport>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const start = useCallback(async (query: string) => {
    setBusy(true);
    setError(undefined);
    setReport(undefined);
    try {
      const created = await api.post<ResearchReport>(API.research.start, { query });
      setReport(created);
      let current = created;
      for (let attempt = 0; attempt < 60 && (current.status === 'queued' || current.status === 'running'); attempt += 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 3_000));
        current = await api.get<ResearchReport>(API.research.detail(created.id));
        setReport(current);
      }
      if (current.status === 'failed') setError('The research run failed. Try narrowing the question.');
      return current;
    } catch (e) {
      setError(toMessage(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  return { report, error, busy, start };
}
