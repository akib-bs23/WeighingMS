import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  WEIGHING_RESULTS,
  type ConsumptionLine,
  type ConsumptionRequest,
  type Uom,
  type WeighingResult,
} from '../../../../shared/contracts/orgatex';

export class ConsumptionLineDto implements ConsumptionLine {
  @IsString()
  @IsNotEmpty()
  componentId!: string;

  @IsString()
  @IsNotEmpty()
  dyestuffCode!: string;

  @IsString()
  @IsNotEmpty()
  lotId!: string;

  @IsInt()
  @Min(1)
  targetMg!: number;

  @IsInt()
  @Min(0)
  actualMg!: number;

  @IsIn(['g', 'kg'])
  uom!: Uom;

  @IsString()
  @IsNotEmpty()
  scaleId!: string;

  @IsIn(WEIGHING_RESULTS)
  result!: WeighingResult;
}

export class ConsumptionRequestDto implements ConsumptionRequest {
  @IsString()
  @IsNotEmpty()
  stationId!: string;

  @IsString()
  @IsNotEmpty()
  operatorId!: string;

  @IsISO8601()
  completedAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConsumptionLineDto)
  lines!: ConsumptionLineDto[];
}
