import { useEffect, useRef } from 'react';

export type FunctionKeyHandlers = {
  enabled: boolean;
  F1?: () => void;
  F2?: () => void;
  F3?: () => void;
  F4?: () => void;
};

/**
 * F1–F4 while the calling screen is mounted (story 008) — scoped to that screen's own lifetime,
 * the same "only listen while active" shape `useScanInput`/`useLiveWeight` already use, rather
 * than an app-wide key router. Pass `enabled: false` (e.g. a dialog is open) to suppress entirely.
 */
export function useFunctionKeys(handlers: FunctionKeyHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  }, [handlers]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const h = ref.current;
      if (!h.enabled) return;
      const action = h[e.key as 'F1' | 'F2' | 'F3' | 'F4'];
      if (action) {
        e.preventDefault();
        action();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
