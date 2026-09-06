import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api/client';
import { API } from '@/constants/config';
import type { StudyPlanInput } from '@/utils/validation';

export interface StudyTaskRow {
  id: string;
  title: string;
  scheduled_for: string;
  minutes: number;
  kind: string;
  status: string;
  version: number;
}

export interface StudyTasksPayload {
  items: StudyTaskRow[];
  progress: number;
  workload: Record<string, number>;
}

export type TaskAction = 'complete' | 'skip' | 'postpone' | 'reschedule' | 'restore';

export function useStudyTasks(start?: string, end?: string) {
  const query = new URLSearchParams();
  if (start !== undefined) query.set('start', start);
  if (end !== undefined) query.set('end', end);
  const suffix = query.toString();
  return useQuery({
    queryKey: ['study-tasks', start ?? '', end ?? ''],
    queryFn: () => api.get<StudyTasksPayload>(`${API.learning.tasks}${suffix.length > 0 ? `?${suffix}` : ''}`),
    staleTime: 30_000,
  });
}

export function useStudyPlan() {
  const client = useQueryClient();

  const plans = useQuery({
    queryKey: ['study-plans'],
    queryFn: () => api.get<{ items: Array<{ id: string; name: string; exam_date: string; daily_minutes: number }> }>(API.learning.plans),
  });

  const create = useMutation({
    mutationFn: (input: StudyPlanInput) =>
      api.post<{ id: string; tasks_created: number }>(API.learning.plans, {
        name: input.name,
        exam_date: input.examDate,
        topics: input.topics,
        daily_minutes: input.dailyMinutes,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['study-plans'] });
      void client.invalidateQueries({ queryKey: ['study-tasks'] });
    },
  });

  /** Optimistic-concurrency aware transition; surfaces 409 conflicts to the caller. */
  const transition = useMutation({
    mutationFn: (input: { taskId: string; action: TaskAction; expectedVersion: number; scheduledFor?: string; reason?: string; force?: boolean }) =>
      api.post<StudyTaskRow>(`${API.learning.tasks}/${input.taskId}/transition`, {
        action: input.action,
        expected_version: input.expectedVersion,
        scheduled_for: input.scheduledFor ?? null,
        reason: input.reason ?? null,
        force: input.force ?? false,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['study-tasks'] });
    },
  });

  return { plans, create, transition };
}
