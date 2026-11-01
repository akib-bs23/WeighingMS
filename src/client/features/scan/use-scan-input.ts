import { useEffect, useRef } from 'react';
import { getScanEvents } from '../../net/scanner';

const SCANNER_POLL_MS = 500;
const WEDGE_TIMEOUT_MS = 500;

/**
 * Delivers scanned codes from two sources while a screen is active: the Dummy scanner feed
 * (polled, only events after this screen opened) and keyboard-wedge input (typed characters then
 * Enter, ignored while the focus is in a text field). Scanner being offline only stops the feed;
 * the caller's touch/selection path is unaffected (FR-32).
 */
export function useScanInput(active: boolean, onScan: (code: string) => void): void {
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;
    let sinceSeq = -1; // -1 marks "not yet initialised"; set from the first poll's lastSeq.
    let cancelled = false;

    async function poll(): Promise<void> {
      try {
        const feed = await getScanEvents(Math.max(sinceSeq, 0));
        if (cancelled) return;
        if (sinceSeq === -1) {
          sinceSeq = feed.lastSeq;
          return;
        }
        for (const event of feed.events) onScanRef.current(event.code);
        sinceSeq = feed.lastSeq;
      } catch {
        // Scanner unavailable: silently skip this poll; touch selection still works.
      }
    }

    void poll();
    const id = setInterval(() => void poll(), SCANNER_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    let buffer = '';
    let timeout: ReturnType<typeof setTimeout> | undefined;

    function reset(): void {
      buffer = '';
      if (timeout) clearTimeout(timeout);
    }

    function onKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.key === 'Enter') {
        if (buffer.length > 0) onScanRef.current(buffer);
        reset();
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(reset, WEDGE_TIMEOUT_MS);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      reset();
    };
  }, [active]);
}
