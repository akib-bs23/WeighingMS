import { Module } from '@nestjs/common';
import { BatchesModule } from '../batches/batches.module';
import { OrgatexModule } from '../integrations/orgatex/orgatex.module';
import { ScaleModule } from '../integrations/scale/scale.module';
import { AuditEventRepository } from './audit-event.repository';
import { OverrideRepository } from './override.repository';
import { WeighingController } from './weighing.controller';
import { WeighingRecordRepository } from './weighing-record.repository';
import { WeighingSessionRepository } from './weighing-session.repository';
import { WeighingSessionService } from './weighing-session.service';

@Module({
  imports: [BatchesModule, OrgatexModule, ScaleModule],
  controllers: [WeighingController],
  providers: [
    WeighingSessionService,
    WeighingSessionRepository,
    WeighingRecordRepository,
    OverrideRepository,
    AuditEventRepository,
  ],
  exports: [WeighingSessionService, WeighingRecordRepository, AuditEventRepository],
})
export class WeighingModule {}
