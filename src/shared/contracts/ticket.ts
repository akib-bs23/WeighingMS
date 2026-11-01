import type { Uom } from './orgatex';

/** One component's line on the ticket (story 002). */
export interface TicketLineView {
  name: string;
  targetMg: number;
  actualMg: number;
  uom: Uom;
}

/** Composed once per session, immutable thereafter — the frozen printed content. */
export interface TicketView {
  ticketId: string;
  sessionId: string;
  batchId: string;
  orderRef: string;
  machineRef: string;
  shadeCode: string;
  /** Completion date, formatted `YYYY-MM-DD HH:MM` at composition time (story 002 AC1). */
  date: string;
  operatorName: string;
  lines: TicketLineView[];
  /** `"ALL WITHIN TOLERANCE"`, or `"OVERRIDDEN — SEE RECORDS"` if any line was overridden. */
  toleranceSummary: string;
  barcodeValue: string;
}

export type TicketPrintStatus = 'PENDING' | 'PRINTED';

/**
 * The ticket plus its current print status — mirrors `WriteBackState` exactly (bolt 003): one
 * row per session, retried in place while `PENDING`, with a separate explicit reprint action
 * once `PRINTED`.
 */
export interface TicketState {
  ticket: TicketView;
  status: TicketPrintStatus;
  jobId: string | null;
  printedAt: string | null;
  isReprint: boolean;
  attempts: number;
  lastError: string | null;
}
