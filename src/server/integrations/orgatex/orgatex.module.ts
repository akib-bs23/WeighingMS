import { Module } from '@nestjs/common';
import { DummyOrgatexAdapter } from './dummy/dummy-orgatex.adapter';
import { DummyOrgatexController } from './dummy/dummy-orgatex.controller';
import { DummyOrgatexService } from './dummy/dummy-orgatex.service';
import { OrgatexTrainingController } from './dummy/orgatex-training.controller';
import { ORGATEX_PORT } from './orgatex.port';
import { OrgatexStatusController } from './orgatex-status.controller';
import { WriteBackController } from './write-back/write-back.controller';
import { WriteBackService } from './write-back/write-back.service';

@Module({
  controllers: [
    DummyOrgatexController,
    OrgatexTrainingController,
    OrgatexStatusController,
    WriteBackController,
  ],
  providers: [
    DummyOrgatexService,
    { provide: ORGATEX_PORT, useClass: DummyOrgatexAdapter },
    WriteBackService,
  ],
  exports: [ORGATEX_PORT, WriteBackService],
})
export class OrgatexModule {}
