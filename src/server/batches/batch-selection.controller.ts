import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import type { BatchSelection } from '../../shared/contracts/station';
import { BatchSelectionService } from './batch-selection.service';

export class BatchSelectionDto {
  /** Batch id touched in the queue or scanned from a batch card. */
  @IsString()
  code!: string;
}

@Controller('station/batch-selection')
export class BatchSelectionController {
  constructor(private readonly selection: BatchSelectionService) {}

  @Post()
  @HttpCode(200)
  select(@Body() dto: BatchSelectionDto): Promise<BatchSelection> {
    return this.selection.select(dto.code);
  }
}
