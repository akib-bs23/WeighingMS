import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type {
  ScaleReadingError,
  ScaleStatus,
  WeightReading,
} from '../../../../shared/contracts/devices';
import { DomainError } from '../../../common/errors/domain-error';
import { SetAvailabilityDto } from '../../../training/dto/availability.dto';
import { DummyScaleService } from './dummy-scale.service';

export class SetWeightDto {
  /** Net weight in mg. Negative and over-capacity values are allowed to simulate bad readings. */
  @IsOptional()
  @IsInt()
  netMg?: number;

  @IsOptional()
  @IsIn(['NO_READING'])
  fault?: ScaleReadingError;
}

export class RampDto {
  @IsInt()
  toMg!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60_000)
  durationMs?: number;
}

/** Training simulator for the Dummy scales (never used by the station screens). */
@Controller('training/scales/:scaleId')
export class ScaleTrainingController {
  constructor(private readonly scales: DummyScaleService) {}

  @Get()
  state(@Param('scaleId') scaleId: string): ScaleStatus {
    return this.scales.getStatus(scaleId);
  }

  @Put()
  setAvailability(@Param('scaleId') scaleId: string, @Body() dto: SetAvailabilityDto): ScaleStatus {
    return this.scales.setOnline(scaleId, dto.online);
  }

  /** Sets an exact (stable) net weight, or injects an indicator fault. */
  @Post('weight')
  @HttpCode(200)
  setWeight(@Param('scaleId') scaleId: string, @Body() dto: SetWeightDto): WeightReading {
    if ((dto.netMg === undefined) === (dto.fault === undefined)) {
      throw new DomainError('VALIDATION_FAILED', 'Provide exactly one of netMg or fault', 400);
    }
    return dto.fault
      ? this.scales.setFault(scaleId, dto.fault)
      : this.scales.setWeight(scaleId, dto.netMg ?? 0);
  }

  /** Simulates a pour from the current net weight to `toMg`. */
  @Post('ramp')
  @HttpCode(200)
  ramp(@Param('scaleId') scaleId: string, @Body() dto: RampDto): WeightReading {
    return this.scales.startRamp(scaleId, dto.toMg, dto.durationMs);
  }
}
