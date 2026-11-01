import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import type {
  ScaleInfo,
  ScaleStatus,
  TareResult,
  WeightReading,
} from '../../../../shared/contracts/devices';
import { DummyScaleService } from './dummy-scale.service';

/**
 * Dummy Scale REST API (workbook Step 16). Training contract only — no claim about real scale
 * indicator protocols.
 */
@Controller('scales')
export class DummyScaleController {
  constructor(private readonly scales: DummyScaleService) {}

  @Get()
  list(): ScaleInfo[] {
    return this.scales.listScales();
  }

  @Get(':scaleId/status')
  status(@Param('scaleId') scaleId: string): ScaleStatus {
    return this.scales.getStatus(scaleId);
  }

  @Get(':scaleId/weight')
  weight(@Param('scaleId') scaleId: string): WeightReading {
    return this.scales.readWeight(scaleId);
  }

  @Post(':scaleId/tare')
  @HttpCode(200)
  tare(@Param('scaleId') scaleId: string): TareResult {
    return this.scales.tare(scaleId);
  }
}
