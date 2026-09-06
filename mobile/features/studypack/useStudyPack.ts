/**
 * Topic -> notes -> PDF job hook.
 *
 * The only required input is a topic string. Every academic-profile field is
 * optional. Progress is recovered after the app is closed and reopened because
 * the active task id is persisted and the job lives entirely on the server.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';

export const ACTIVE_JOB_KEY = 'sf.studypack.activeTask';

export interface StudentProfile {
  institution?: string;
  board?: string;
  course?: string;
  branch?: string;
  semester?: string;
  subject?: string;
  subject_code?: string;
  syllabus_year?: string;
  target_exam?: string;
  exam_date?: string;
  language?: 'en' | 'hi' | 'hinglish';
  explanation_depth?: 'easy' | 'standard' | 'deep';
  available_study_time_minutes?: number;
}

export interface StageDescriptor {
  key: string;
  label: string;
  progress: number;
}

export interface JobState {
  taskId?: string;
  status: 'idle' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  stageLabel?: string;
  result?: StudyPackResult;
  errorCode?: string;
}

export interface StudyPackResult {
  note_id: string;
  topic: string;
  subject: string;
  academic_context: string;
  sections: string[];
  citation_count: number;
  limitations: string[];
  validations: Record<string, unknown>;
  pdf: {
    filename: string;
    status: string;
    storage_key: string | null;
    checksum: string;
    byte_size: number;
    error: string | null;
  };
}

const POLL_INTERVAL_MS = 2000;

export function useStudyPack() {
  const [state, setState] = useState<JobState>({ status: 'idle', progress: 0 });
  const [stages, setStages] = useState<StageDescriptor[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const poll = useCallback(
    async (taskId: string) => {
      try {
        const job = await api.get<{
          status: JobState['status'];
          progress: number;
          result?: StudyPackResult & { stage_label?: string };
          error_code?: string;
        }>(API.studypack.job(taskId));
        setState((prev) => ({
          ...prev,
          taskId,
          status: job.status,
          progress: job.progress ?? prev.progress,
          result: job.result,
          errorCode: job.error_code,
        }));
        if (['succeeded', 'failed', 'cancelled'].includes(job.status)) {
          await AsyncStorage.removeItem(ACTIVE_JOB_KEY);
          stopPolling();
          return;
        }
      } catch {
        // transient network failure: keep polling, the job survives on the server
      }
      timer.current = setTimeout(() => void poll(taskId), POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  /** Resume an in-flight job after the app is reopened. */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const catalogue = await api.get<{ stages: StageDescriptor[] }>(API.studypack.stages);
        if (mounted) setStages(catalogue.stages);
      } catch {
        /* stage catalogue is cosmetic */
      }
      const saved = await AsyncStorage.getItem(ACTIVE_JOB_KEY);
      if (saved && mounted) {
        setState({ status: 'running', progress: 0, taskId: saved });
        void poll(saved);
      }
    })();
    return () => {
      mounted = false;
      stopPolling();
    };
  }, [poll, stopPolling]);

  const start = useCallback(
    async (topic: string, profile?: StudentProfile) => {
      const trimmed = topic.trim();
      if (trimmed.length < 2) throw new Error('Enter a topic to research.');
      setState({ status: 'queued', progress: 0 });
      const job = await api.post<{ task_id: string; status: JobState['status'] }>(
        API.studypack.createJob,
        { topic: trimmed, profile: profile ?? null },
        { idempotencyKey: `studypack-${trimmed.toLowerCase()}-${JSON.stringify(profile ?? {})}` },
      );
      await AsyncStorage.setItem(ACTIVE_JOB_KEY, job.task_id);
      setState({ status: job.status, progress: 0, taskId: job.task_id });
      void poll(job.task_id);
      return job.task_id;
    },
    [poll],
  );

  const cancel = useCallback(async () => {
    if (!state.taskId) return;
    await api.post(API.studypack.cancel(state.taskId));
    setState((prev) => ({ ...prev, status: 'cancelled' }));
    await AsyncStorage.removeItem(ACTIVE_JOB_KEY);
    stopPolling();
  }, [state.taskId, stopPolling]);

  const retry = useCallback(async () => {
    if (!state.taskId) return;
    await api.post(API.studypack.retry(state.taskId));
    setState((prev) => ({ ...prev, status: 'queued', progress: 0, errorCode: undefined }));
    await AsyncStorage.setItem(ACTIVE_JOB_KEY, state.taskId);
    void poll(state.taskId);
  }, [state.taskId, poll]);

  return { state, stages, start, cancel, retry };
}
