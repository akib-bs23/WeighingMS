import { Injectable } from '@nestjs/common';
import type {
  ConsumptionReceipt,
  ConsumptionRequest,
  OrgatexBatch,
  OrgatexRecipe,
} from '../../../../shared/contracts/orgatex';
import { settle } from '../../../common/async/settle';
import type { OrgatexPort } from '../orgatex.port';
import { DummyOrgatexService } from './dummy-orgatex.service';

/**
 * OrgatexPort backed by the in-process Dummy OrgaTEX. Errors propagate unchanged, so callers see
 * the same ORGATEX_UNAVAILABLE / *_NOT_FOUND semantics a real network adapter would produce.
 */
@Injectable()
export class DummyOrgatexAdapter implements OrgatexPort {
  private lastContact: Date | null = null;

  constructor(private readonly dummy: DummyOrgatexService) {}

  listBatches(): Promise<OrgatexBatch[]> {
    return this.call(() => this.dummy.listBatches());
  }

  getBatch(batchId: string): Promise<OrgatexBatch> {
    return this.call(() => this.dummy.getBatch(batchId));
  }

  getRecipe(batchId: string): Promise<OrgatexRecipe> {
    return this.call(() => this.dummy.getRecipe(batchId));
  }

  postConsumption(
    batchId: string,
    idempotencyKey: string,
    request: ConsumptionRequest,
  ): Promise<ConsumptionReceipt> {
    return this.call(() => this.dummy.receiveConsumption(batchId, idempotencyKey, request));
  }

  lastSuccessfulContactAt(): Date | null {
    return this.lastContact;
  }

  isOnline(): boolean {
    return this.dummy.isOnline();
  }

  private call<T>(fn: () => T): Promise<T> {
    return settle(() => {
      const result = fn();
      this.lastContact = new Date();
      return result;
    });
  }
}
