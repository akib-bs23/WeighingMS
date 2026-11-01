import { useEffect, useRef, useState } from 'react';
import type { WeightReading } from '../../../shared/contracts/devices';
import { getScaleStatus } from '../../net/devices';
import { request } from '../../net/http';

const POLL_MS = 100;

function getWeight(scaleId: string): Promise<WeightReading> {
  return request(`/scales/${scaleId}/weight`);
}

export interface LiveWeight {
  reading: WeightReading | null;
  /** True when the most recent poll failed — independent of any stale prior reading (story 007). */
  offline: boolean;
  /** The scale's capacity, fetched once per scale (not polled) — for client-side `classifyReading`. */
  capacityMg: number | null;
}

/**
 * Polls the selected scale's live weight every 100 ms while active (TD-10, story 004). A
 * response is only applied if it is newer than the last one already shown — an earlier poll's
 * response arriving late (out of order) must never overwrite a later, already-applied reading.
 */
export function useLiveWeight(scaleId: string | null, active: boolean): LiveWeight {
  const [reading, setReading] = useState<WeightReading | null>(null);
  const [offline, setOffline] = useState(false);
  const [capacityMg, setCapacityMg] = useState<number | null>(null);
  const [trackedScaleId, setTrackedScaleId] = useState(scaleId);
  const lastAppliedAt = useRef<number>(0);

  // Reset the displayed reading synchronously during render when the scale changes — React's
  // documented pattern for "adjusting state in response to a prop change" (the guarded
  // comparison makes this safe: it only runs the one extra time needed to apply the reset, not
  // on every render). The ref itself is mutated in the effect below, which is the normal place.
  if (scaleId !== trackedScaleId) {
    setTrackedScaleId(scaleId);
    setReading(null);
    setOffline(false);
    setCapacityMg(null);
  }

  useEffect(() => {
    if (!active || !scaleId) return;
    let cancelled = false;
    getScaleStatus(scaleId)
      .then((status) => {
        if (!cancelled) setCapacityMg(status.capacityMg);
      })
      .catch(() => {
        // Capacity stays null — INVALID_READING classification simply can't run yet; the
        // SCALE OFFLINE state (driven by the weight poll below) already covers this case.
      });
    return () => {
      cancelled = true;
    };
  }, [scaleId, active]);

  useEffect(() => {
    lastAppliedAt.current = 0;
    if (!active || !scaleId) return;

    let cancelled = false;
    async function poll(): Promise<void> {
      try {
        const next = await getWeight(scaleId as string);
        if (cancelled) return;
        setOffline(false);
        const at = Date.parse(next.readAt);
        if (at <= lastAppliedAt.current) return; // stale/out-of-order — ignore
        lastAppliedAt.current = at;
        setReading(next);
      } catch {
        if (!cancelled) setOffline(true);
      }
    }

    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [scaleId, active]);

  return { reading, offline, capacityMg };
}
