import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import type { DeviceAvailability, ScanFeed } from '../../../../shared/contracts/devices';
import { DummyScannerService } from './dummy-scanner.service';

export class ScanFeedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  since?: number;
}

/** Dummy scanner API (training contract — no claim about real scanner interfaces). */
@Controller('scanner')
export class DummyScannerController {
  constructor(private readonly scanner: DummyScannerService) {}

  @Get('status')
  status(): DeviceAvailability {
    return { online: this.scanner.isOnline() };
  }

  @Get('events')
  events(@Query() query: ScanFeedQueryDto): ScanFeed {
    return this.scanner.feed(query.since);
  }
}
