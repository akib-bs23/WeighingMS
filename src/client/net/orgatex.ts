import type { OrgatexBatch, OrgatexRecipe } from '../../shared/contracts/orgatex';
import { request } from './http';

/*
 * Browser-side OrgaTEX access (approved Option A, bolt 004): the station reads the queue, batch
 * and recipe from the OrgaTEX-contract endpoints through this one module, so the integration
 * stays in a single replaceable place (IR-07).
 */

export function listBatches(): Promise<OrgatexBatch[]> {
  return request('/batches');
}

export function getBatch(batchId: string): Promise<OrgatexBatch> {
  return request(`/batches/${encodeURIComponent(batchId)}`);
}

export function getRecipe(batchId: string): Promise<OrgatexRecipe> {
  return request(`/batches/${encodeURIComponent(batchId)}/recipe`);
}
