import { Global, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { ResetRegistry } from './reset.registry';
import { SeedService } from './seed/seed.service';
import { TrainingController } from './training.controller';

@Global()
@Module({
  controllers: [TrainingController],
  providers: [ResetRegistry, SeedService],
  exports: [ResetRegistry, SeedService],
})
export class TrainingModule implements OnApplicationBootstrap {
  constructor(private readonly registry: ResetRegistry) {}

  onApplicationBootstrap(): void {
    this.registry.seedMissing();
  }
}
