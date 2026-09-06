import { useCallback, useEffect, useRef, useState } from 'react';
import { toMessage } from '@/utils/errors';

export interface AsyncState<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
}

export interface AsyncController<T, A extends readonly unknown[]> extends AsyncState<T> {
  run: (...args: A) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * Runs an async task with cancellation-safe state updates.
 * Late responses from stale calls are discarded.
 */
export function useAsync<T, A extends readonly unknown[] = []>(
  task: (...args: A) => Promise<T>,
): AsyncController<T, A> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: undefined, loading: false });
  const mounted = useRef(true);
  const callId = useRef(0);
  const taskRef = useRef(task);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const run = useCallback(async (...args: A): Promise<T | undefined> => {
    callId.current += 1;
    const id = callId.current;
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const data = await taskRef.current(...args);
      if (!mounted.current || id !== callId.current) return undefined;
      setState({ data, error: undefined, loading: false });
      return data;
    } catch (error) {
      if (!mounted.current || id !== callId.current) return undefined;
      setState({ data: undefined, error: toMessage(error), loading: false });
      return undefined;
    }
  }, []);

  const reset = useCallback(() => {
    callId.current += 1;
    setState({ data: undefined, error: undefined, loading: false });
  }, []);

  return { ...state, run, reset };
}
