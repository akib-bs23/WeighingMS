import { Body, Controller, Post, Put } from '@nestjs/common';
import { IsString } from 'class-validator';
import type { DeviceAvailability, ScanEvent } from '../../../../shared/contracts/devices';
import { SetAvailabilityDto } from '../../../training/dto/availability.dto';
import { DummyScannerService } from './dummy-scanner.service';

export class InjectScanDto {
  @IsString()
  code!: string;
}

/** Training simulator for the Dummy scanner (never used by the station screens). */
@Controller('training/scanner')
export class ScannerTrainingController {
  constructor(private readonly scanner: DummyScannerService) {}

  @Put()
  setAvailability(@Body() dto: SetAvailabilityDto): DeviceAvailability {
    this.scanner.setOnline(dto.online);
    return { online: this.scanner.isOnline() };
  }

  @Post('scans')
  inject(@Body() dto: InjectScanDto): ScanEvent {
    return this.scanner.inject(dto.code);
  }
}
