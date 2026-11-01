import type { Uom } from './orgatex';

/*
 * Dummy device training contracts (scales, scanner, printer). They make no claim about real
 * indicator, scanner or printer protocols (brief A-05, A-10, OQ-04, OQ-12). Quantities are
 * integer milligrams.
 */

export type ScaleClass = 'PRECISION' | 'FLOOR';

export interface ScaleInfo {
  scaleId: string;
  class: ScaleClass;
  name: string;
  /** Display unit for readings on this scale. */
  uom: Uom;
  capacityMg: number;
  resolutionMg: number;
  online: boolean;
}

export interface ScaleStatus {
  scaleId: string;
  online: boolean;
  state: 'READY' | 'OFFLINE';
  capacityMg: number;
  resolutionMg: number;
}

/** Fault an indicator can report instead of a value. */
export type ScaleReadingError = 'NO_READING';

/**
 * A reading exactly as the indicator reports it. Negative or over-capacity values are passed
 * through; judging validity is WeighingMS's job, not the device's.
 */
export interface WeightReading {
  scaleId: string;
  netMg: number | null;
  stable: boolean;
  overload: boolean;
  error: ScaleReadingError | null;
  readAt: string;
}

export interface TareResult {
  scaleId: string;
  tareMg: number;
  netMg: number;
}

export interface ScanEvent {
  seq: number;
  code: string;
  scannedAt: string;
}

export interface ScanFeed {
  events: ScanEvent[];
  lastSeq: number;
}

export interface DeviceAvailability {
  online: boolean;
}

/** Caller assigns the id (WeighingMS's own ticket id) — the Dummy printer has no concept of a
 *  ticket, it just prints lines of text and a barcode value under that id. */
export interface PrintTicketRequest {
  ticketId: string;
  lines: string[];
  barcodeValue: string;
}

/**
 * `'PRINTED'` is the only success outcome — like every other Dummy device, an unavailable
 * printer throws rather than returning a degraded status (no speculative `QUEUED`/`FAILED`).
 */
export interface PrintJobResult {
  jobId: string;
  ticketId: string;
  status: 'PRINTED';
  renderedLines: string[];
}
