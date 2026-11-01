import { Module } from '@nestjs/common';
import { DummyPrinterAdapter } from './dummy/dummy-printer.adapter';
import { DummyPrinterController } from './dummy/dummy-printer.controller';
import { DummyPrinterService } from './dummy/dummy-printer.service';
import { PrinterTrainingController } from './dummy/printer-training.controller';
import { PRINTER_PORT } from './printer.port';

@Module({
  controllers: [DummyPrinterController, PrinterTrainingController],
  providers: [DummyPrinterService, { provide: PRINTER_PORT, useClass: DummyPrinterAdapter }],
  exports: [PRINTER_PORT],
})
export class PrinterModule {}
