import { Controller, Get } from '@nestjs/common';
import type { StationContext } from '../../shared/contracts/station';
import { SeedService } from '../training/seed/seed.service';

/**
 * Station context for the top bar. Training build: the session operator is the seeded operator
 * (TD-6; no sign-in screen). Supervisor credentials are never exposed here.
 */
@Controller('station')
export class StationController {
  constructor(private readonly seed: SeedService) {}

  @Get()
  context(): StationContext {
    const { station } = this.seed.get();
    return {
      stationId: station.stationId,
      name: station.name,
      operator: this.seed.getSessionOperator(),
    };
  }
}
