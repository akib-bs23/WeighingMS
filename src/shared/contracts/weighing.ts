import type { OrgatexDyestuff, Uom, WeighingResult } from './orgatex';
import type { WriteBackState } from './write-back';
import type { IdentityStatus } from '../weighing/identity';
import type { ScaleClass } from '../weighing/scale-selection';
import type { ComponentState } from '../weighing/progression';

export interface ComponentView {
  componentId: string;
  sequence: number;
  state: ComponentState;
  dyestuff: OrgatexDyestuff;
  lotId: string;
  containerId: string;
  scaleId: string | null;
  scaleClass: ScaleClass;
  uom: Uom;
  targetMg: number;
  toleranceMg: number;
  displayMaxMg: number;
  tareMg: number | null;
  identity: IdentityStatus;
  /** Exact wording for a mismatch (story 007 AC2), e.g. "Wrong dyestuff: scanned DYE-2204,
   *  expected DYE-4471"; null unless `identity === 'MISMATCH'`. */
  identityMismatchDetail: string | null;
}

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface SessionView {
  sessionId: string;
  batchId: string;
  /** Snapshotted from OrgaTEX at session start (bolt 010) — ticket composition reads these from
   *  here rather than calling OrgaTEX again long after weighing is done. */
  orderRef: string;
  machineRef: string;
  shadeCode: string;
  stationId: string;
  operatorId: string;
  status: SessionStatus;
  activeComponentId: string | null;
  startedAt: string;
  completedAt: string | null;
  components: ComponentView[];
}

/** Present only on a `result: 'OVERRIDDEN'` record (Invariant 6: always created together). */
export interface OverrideView {
  supervisorId: string;
  reason: string;
  authorisedAt: string;
}

export interface WeighingRecordView {
  recordId: string;
  sessionId: string;
  componentId: string;
  lotId: string;
  containerId: string;
  tareMg: number;
  scaleId: string;
  targetMg: number;
  toleranceMinMg: number;
  toleranceMaxMg: number;
  actualMg: number;
  uom: Uom;
  result: WeighingResult;
  operatorId: string;
  confirmedAt: string;
  override: OverrideView | null;
}

export interface ConfirmResult {
  record: WeighingRecordView;
  session: SessionView;
}

export type AuditEventType = 'OVERRIDE' | 'ABANDON' | 'REPRINT';

/** Time-ordered, append-only audit trail entry (story 013 AC2). */
export interface AuditEventView {
  eventId: string;
  sessionId: string;
  type: AuditEventType;
  actorId: string;
  detail: string;
  occurredAt: string;
}

/**
 * A pure, always-recomputed projection (never persisted — story 012). Available before
 * completion too (a live "progress so far" read); `elapsedMs`/`writeBack` are only meaningful
 * once `completedAt` is set.
 */
export interface BatchSummaryView {
  sessionId: string;
  batchId: string;
  componentsDone: number;
  componentsTotal: number;
  /** false if any record's result is 'OVERRIDDEN' (TD-11: the only non-OK outcome ever recorded) */
  allWithinTolerance: boolean;
  totalDispensedMg: number;
  elapsedMs: number | null;
  operatorName: string;
  writeBack: WriteBackState | null;
}

export interface CompletionResult {
  session: SessionView;
  summary: BatchSummaryView;
}
