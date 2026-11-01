import { Module } from '@nestjs/common';
import { DummyScaleAdapter } from './dummy/dummy-scale.adapter';
import { DummyScaleController } from './dummy/dummy-scale.controller';
import { DummyScaleService } from './dummy/dummy-scale.service';
import { ScaleTrainingController } from './dummy/scale-training.controller';
import { SCALE_PORT } from './scale.port';

@Module({
  controllers: [DummyScaleController, ScaleTrainingController],
  providers: [DummyScaleService, { provide: SCALE_PORT, useClass: DummyScaleAdapter }],
  exports: [SCALE_PORT],
})
export class ScaleModule {}
