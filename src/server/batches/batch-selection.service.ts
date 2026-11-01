import { Inject, Injectable } from '@nestjs/common';
import { checkEligibility } from '../../shared/batches/eligibility';
import { classifyScan } from '../../shared/batches/scan-code';
import type { BatchSelection } from '../../shared/contracts/station';
import { DomainError } from '../common/errors/domain-error';
import { ORGATEX_PORT, type OrgatexPort } from '../integrations/orgatex/orgatex.port';

/**
 * Server-side gate for starting work on a batch: reads batch then recipe through OrgatexPort and
 * refuses batches OrgaTEX has not released. Session start relies on it, so the UI cannot bypass
 * the rule.
 */
@Injectable()
export class BatchSelectionService {
  constructor(@Inject(ORGATEX_PORT) private readonly orgatex: OrgatexPort) {}

  /** Accepts a touched batch id or a scanned batch-card code. */
  async select(rawCode: string): Promise<BatchSelection> {
    const code = rawCode.trim();
    if (code.length === 0) {
      throw new DomainError('VALIDATION_FAILED', 'Batch code is required', 400);
    }
    if (classifyScan(code) !== 'BATCH') {
      throw new DomainError('NOT_A_BATCH_CODE', `${code} is not a batch card`, 422, { code });
    }
    return this.prepareForWeighing(code);
  }

  async prepareForWeighing(batchId: string): Promise<BatchSelection> {
    const batch = await this.orgatex.getBatch(batchId);
    const eligibility = checkEligibility(batch);
    if (!eligibility.eligible) {
      throw new DomainError(eligibility.code, eligibility.message, 409, {
        batchId,
        status: batch.status,
      });
    }
    const recipe = await this.orgatex.getRecipe(batchId);
    return { batch, recipe };
  }
}
