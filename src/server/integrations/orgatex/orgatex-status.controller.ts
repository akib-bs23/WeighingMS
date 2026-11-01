import { Controller, Get, Inject } from '@nestjs/common';
import type { OrgatexLinkStatus } from '../../../shared/contracts/orgatex';
import { ORGATEX_PORT, type OrgatexPort } from './orgatex.port';

/**
 * The station's own read of OrgaTEX's link state, for the status strip (FR-28). Deliberately
 * separate from `/api/training/orgatex` — that endpoint is the simulator surface and must never
 * be called by the station screens themselves (same convention as every other Dummy device).
 */
@Controller('orgatex/status')
export class OrgatexStatusController {
  constructor(@Inject(ORGATEX_PORT) private readonly orgatex: OrgatexPort) {}

  @Get()
  status(): OrgatexLinkStatus {
    return {
      online: this.orgatex.isOnline(),
      lastSuccessfulContactAt: this.orgatex.lastSuccessfulContactAt()?.toISOString() ?? null,
    };
  }
}
