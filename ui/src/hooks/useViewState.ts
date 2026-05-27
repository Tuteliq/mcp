import { useState, useCallback, useRef } from 'react';

/**
 * Persists and restores lightweight UI state (collapsed sections, checked steps, etc.)
 * scoped to a specific tool invocation via its viewUUID.
 *
 * @see https://apps.extensions.modelcontextprotocol.io/api/documents/patterns.html#persisting-view-state
 */
export function useViewState<T>(viewUUID: string | undefined, initial: T) {
  const loaded = useRef(false);

  const [state, setStateRaw] = useState<T>(() => {
    if (!viewUUID) return initial;
    try {
      const saved = localStorage.getItem(`tuteliq:view:${viewUUID}`);
      if (saved) {
        loaded.current = true;
        return JSON.parse(saved) as T;
      }
    } catch { /* ignore corrupt data */ }
    return initial;
  });

  const setState = useCallback(
    (next: T | ((prev: T) => T)) => {
      setStateRaw((prev) => {
        const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        if (viewUUID) {
          try {
            localStorage.setItem(`tuteliq:view:${viewUUID}`, JSON.stringify(value));
          } catch { /* quota exceeded — degrade gracefully */ }
        }
        return value;
      });
    },
    [viewUUID],
  );

  return [state, setState, loaded.current] as const;
}
