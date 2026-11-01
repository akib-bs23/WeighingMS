import { Global, Module } from '@nestjs/common';

/** Injectable time source so time-dependent behaviour (simulated pours) is testable. */
export interface Clock {
  now(): number;
}

export const CLOCK = Symbol('CLOCK');

export const systemClock: Clock = { now: () => Date.now() };

@Global()
@Module({
  providers: [{ provide: CLOCK, useValue: systemClock }],
  exports: [CLOCK],
})
export class ClockModule {}
