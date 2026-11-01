import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import type { StoredConsumption } from '../../../../shared/contracts/orgatex';
import { SetAvailabilityDto } from '../../../training/dto/availability.dto';
import { DummyOrgatexService } from './dummy-orgatex.service';

export interface OrgatexTrainingState {
  online: boolean;
  lastServedAt: string | null;
}

/** Training control: take the Dummy OrgaTEX offline/online (workbook Step 30). */
@Controller('training/orgatex')
export class OrgatexTrainingController {
  constructor(private readonly orgatex: DummyOrgatexService) {}

  @Get()
  state(): OrgatexTrainingState {
    return {
      online: this.orgatex.isOnline(),
      lastServedAt: this.orgatex.getLastServedAt()?.toISOString() ?? null,
    };
  }

  @Put()
  setAvailability(@Body() dto: SetAvailabilityDto): OrgatexTrainingState {
    this.orgatex.setOnline(dto.online);
    return this.state();
  }

  /** Consumption records received by the Dummy OrgaTEX, optionally for one batch. */
  @Get('consumption')
  consumption(@Query('batchId') batchId?: string): StoredConsumption[] {
    return this.orgatex.listConsumption(batchId);
  }
}
