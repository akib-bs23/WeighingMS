import { useEffect, useRef, useState } from 'react';
import type { DeviceAvailability, ScaleStatus } from '../../shared/contracts/devices';
import type { OrgatexLinkStatus } from '../../shared/contracts/orgatex';
import {
  getOrgatexStatus,
  getPrinterStatus,
  getScaleStatus,
  getScannerStatus,
} from '../net/devices';

/** 1 Hz is ample margin under the 2 s detection requirement (story 007 AC2) without the 10 Hz
 *  overhead `useLiveWeight` needs for the active scale's own live reading. */
const STATUS_POLL_MS = 1_000;

const SCALE_LABEL: Record<string, string> = { 'scale-3kg': '3 kg', 'scale-32kg': '32 kg' };

/** Polls `fetcher` at `intervalMs`; any failed poll (device offline) reports `null`. */
function usePolledStatus<T>(fetcher: () => Promise<T>, intervalMs: number): T | null {
  const [value, setValue] = useState<T | null>(null);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    let cancelled = false;
    async function poll(): Promise<void> {
      try {
        const result = await fetcherRef.current();
        if (!cancelled) setValue(result);
      } catch {
        if (!cancelled) setValue(null);
      }
    }
    void poll();
    const id = setInterval(() => void poll(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return value;
}

function Dot({ up }: { up: boolean }) {
  return <span className={`dot ${up ? 'up' : 'down'}`} aria-hidden="true" />;
}

/** Bottom strip: live device/OrgaTEX status (FR-28), language, clock. */
export function StatusStrip() {
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString('en-GB'));
  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-GB'));
    }, 1_000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const scale3kg = usePolledStatus<ScaleStatus>(() => getScaleStatus('scale-3kg'), STATUS_POLL_MS);
  const scale32kg = usePolledStatus<ScaleStatus>(
    () => getScaleStatus('scale-32kg'),
    STATUS_POLL_MS,
  );
  const scanner = usePolledStatus<DeviceAvailability>(getScannerStatus, STATUS_POLL_MS);
  const printer = usePolledStatus<DeviceAvailability>(getPrinterStatus, STATUS_POLL_MS);
  const orgatex = usePolledStatus<OrgatexLinkStatus>(getOrgatexStatus, STATUS_POLL_MS);

  return (
    <div className="wms-strip">
      <ScaleStat scaleId="scale-3kg" status={scale3kg} />
      <ScaleStat scaleId="scale-32kg" status={scale32kg} />
      <span className="stat">
        <Dot up={scanner?.online ?? false} />
        SCANNER
      </span>
      <span className="stat">
        <Dot up={printer?.online ?? false} />
        PRINTER
      </span>
      <OrgatexStat status={orgatex} />
      <span className="wms-spacer" />
      <span className="stat">EN</span>
      <span className="stat">{clock}</span>
    </div>
  );
}

function ScaleStat({ scaleId, status }: { scaleId: string; status: ScaleStatus | null }) {
  const up = status?.online ?? false;
  return (
    <span className="stat">
      <Dot up={up} />
      SCALE {SCALE_LABEL[scaleId]} · {up ? 'READY' : 'OFFLINE'}
    </span>
  );
}

function OrgatexStat({ status }: { status: OrgatexLinkStatus | null }) {
  const up = status?.online ?? false;
  const linkedAt = status?.lastSuccessfulContactAt;
  return (
    <span className="stat">
      <Dot up={up} />
      ORGATEX · {up && linkedAt ? `LINKED ${linkedAt.slice(11, 16)}` : 'UNAVAILABLE'}
    </span>
  );
}
