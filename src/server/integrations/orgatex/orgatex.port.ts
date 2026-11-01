import type {
  ConsumptionReceipt,
  ConsumptionRequest,
  OrgatexBatch,
  OrgatexRecipe,
} from '../../../shared/contracts/orgatex';

/**
 * The only way WeighingMS talks to OrgaTEX (brief IR-07). Bound to the Dummy adapter for training;
 * a real adapter (REST, OPC-UA, DB or file) would implement the same interface.
 *
 * Implementations throw `UnavailableError('ORGATEX_UNAVAILABLE')` when OrgaTEX cannot be reached
 * and `NotFoundError` for unknown batches or recipes.
 */
export interface OrgatexPort {
  listBatches(): Promise<OrgatexBatch[]>;
  getBatch(batchId: string): Promise<OrgatexBatch>;
  getRecipe(batchId: string): Promise<OrgatexRecipe>;
  /** Posts actual consumption; a retry with the same key and payload must not double-post. */
  postConsumption(
    batchId: string,
    idempotencyKey: string,
    request: ConsumptionRequest,
  ): Promise<ConsumptionReceipt>;
  /** Time of the last successful call, for the station's OrgaTEX link indicator. */
  lastSuccessfulContactAt(): Date | null;
  /** Whether OrgaTEX currently responds, for the status strip (FR-28). */
  isOnline(): boolean;
}

export const ORGATEX_PORT = Symbol('ORGATEX_PORT');
