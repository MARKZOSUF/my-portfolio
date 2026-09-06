import { useEffect, useRef, useState } from 'react';

/** Returns `value` after it has stopped changing for `delayMs`. */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Returns a stable debounced wrapper around a callback. */
export function useDebouncedCallback<A extends readonly unknown[]>(
  callback: (...args: A) => void,
  delayMs = 300,
): (...args: A) => void {
  const latest = useRef(callback);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    latest.current = callback;
  }, [callback]);

  useEffect(() => () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
  }, []);

  return (...args: A) => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(...args), delayMs);
  };
}
