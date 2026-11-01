import type { OrgatexBatch } from '../contracts/orgatex';

export type Eligibility =
  { eligible: true } | { eligible: false; code: 'BATCH_NOT_RELEASED'; message: string };

/**
 * Only batches OrgaTEX has released may be weighed (BR-03, FR-3, TD-1). Shared so the station
 * shows the reason immediately and the server enforces the identical rule.
 */
export function checkEligibility(batch: Pick<OrgatexBatch, 'batchId' | 'status'>): Eligibility {
  if (batch.status === 'RELEASED') return { eligible: true };
  return {
    eligible: false,
    code: 'BATCH_NOT_RELEASED',
    message: `Batch ${batch.batchId} not released by OrgaTEX (status ${batch.status})`,
  };
}
