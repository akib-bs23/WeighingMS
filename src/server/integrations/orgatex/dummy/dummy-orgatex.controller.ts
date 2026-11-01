import { Body, Controller, Get, Headers, HttpCode, Param, Post } from '@nestjs/common';
import type {
  ConsumptionReceipt,
  OrgatexBatch,
  OrgatexRecipe,
} from '../../../../shared/contracts/orgatex';
import { DomainError } from '../../../common/errors/domain-error';
import { ConsumptionRequestDto } from './consumption.dto';
import { DummyOrgatexService } from './dummy-orgatex.service';

/**
 * Dummy OrgaTEX REST API (workbook Step 16). Training contract only — no claim about the real
 * OrgaTEX interface.
 */
@Controller('batches')
export class DummyOrgatexController {
  constructor(private readonly orgatex: DummyOrgatexService) {}

  @Get()
  listBatches(): OrgatexBatch[] {
    return this.orgatex.listBatches();
  }

  @Get(':batchId')
  getBatch(@Param('batchId') batchId: string): OrgatexBatch {
    return this.orgatex.getBatch(batchId);
  }

  @Get(':batchId/recipe')
  getRecipe(@Param('batchId') batchId: string): OrgatexRecipe {
    return this.orgatex.getRecipe(batchId);
  }

  /** Receives actual consumption (idempotent by the `Idempotency-Key` header). */
  @Post(':batchId/consumption')
  @HttpCode(200)
  receiveConsumption(
    @Param('batchId') batchId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() request: ConsumptionRequestDto,
  ): ConsumptionReceipt {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new DomainError('VALIDATION_FAILED', 'Idempotency-Key header is required', 400);
    }
    return this.orgatex.receiveConsumption(batchId, key, request);
  }
}
