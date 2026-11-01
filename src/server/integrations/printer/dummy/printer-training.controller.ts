import { Body, Controller, Put } from '@nestjs/common';
import type { DeviceAvailability } from '../../../../shared/contracts/devices';
import { SetAvailabilityDto } from '../../../training/dto/availability.dto';
import { DummyPrinterService } from './dummy-printer.service';

/** Training simulator for the Dummy printer (never used by the station screens). */
@Controller('training/printer')
export class PrinterTrainingController {
  constructor(private readonly printer: DummyPrinterService) {}

  @Put()
  setAvailability(@Body() dto: SetAvailabilityDto): DeviceAvailability {
    this.printer.setOnline(dto.online);
    return { online: this.printer.isOnline() };
  }
}
