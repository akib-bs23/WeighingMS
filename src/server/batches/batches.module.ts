import { Module } from '@nestjs/common';
import { OrgatexModule } from '../integrations/orgatex/orgatex.module';
import { BatchSelectionController } from './batch-selection.controller';
import { BatchSelectionService } from './batch-selection.service';

@Module({
  imports: [OrgatexModule],
  controllers: [BatchSelectionController],
  providers: [BatchSelectionService],
  exports: [BatchSelectionService],
})
export class BatchesModule {}
