import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { IsArray, IsString } from 'class-validator';
import type { DeviceAvailability, PrintJobResult } from '../../../../shared/contracts/devices';
import { DummyPrinterService } from './dummy-printer.service';

export class PrintTicketDto {
  @IsString()
  ticketId!: string;

  @IsArray()
  @IsString({ each: true })
  lines!: string[];

  @IsString()
  barcodeValue!: string;
}

/** Dummy Printer REST API (workbook Step 27). Training contract only — no claim about a real
 *  printer protocol. */
@Controller()
export class DummyPrinterController {
  constructor(private readonly printer: DummyPrinterService) {}

  @Post('tickets')
  @HttpCode(201)
  print(@Body() dto: PrintTicketDto): PrintJobResult {
    return this.printer.print(dto);
  }

  @Get('printer/status')
  status(): DeviceAvailability {
    return { online: this.printer.isOnline() };
  }
}
