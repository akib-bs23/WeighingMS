/** WeighingMS-side status of posting a completed session's consumption to OrgaTEX (FR-24). */
export type WriteBackStatus = 'PENDING' | 'CONFIRMED';

export interface WriteBackState {
  sessionId: string;
  batchId: string;
  status: WriteBackStatus;
  consumptionId: string | null;
  confirmedAt: string | null;
  attempts: number;
  lastError: string | null;
}
