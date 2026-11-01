import { Controller, HttpCode, Post } from '@nestjs/common';
import { ResetRegistry } from './reset.registry';

/** Training-only controls. Never called by the station screens. */
@Controller('training')
export class TrainingController {
  constructor(private readonly registry: ResetRegistry) {}

  @Post('reset')
  @HttpCode(200)
  reset(): { reset: string[]; resetAt: string } {
    return { reset: this.registry.resetAll(), resetAt: new Date().toISOString() };
  }
}
