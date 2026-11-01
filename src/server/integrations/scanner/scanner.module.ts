import { Module } from '@nestjs/common';
import { DummyScannerAdapter } from './dummy/dummy-scanner.adapter';
import { DummyScannerController } from './dummy/dummy-scanner.controller';
import { DummyScannerService } from './dummy/dummy-scanner.service';
import { ScannerTrainingController } from './dummy/scanner-training.controller';
import { SCANNER_PORT } from './scanner.port';

@Module({
  controllers: [DummyScannerController, ScannerTrainingController],
  providers: [DummyScannerService, { provide: SCANNER_PORT, useClass: DummyScannerAdapter }],
  exports: [SCANNER_PORT],
})
export class ScannerModule {}
