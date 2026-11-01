import { Injectable, Logger } from '@nestjs/common';

/** A module that owns seeded or simulated state contributes one of these. */
export interface ResettableModule {
  readonly name: string;
  /** True when the module's seed slice is already present. */
  isSeeded(): boolean;
  /** Restores the module's state to the training seed. */
  reset(): void;
}

/**
 * Registry of every module whose state belongs to the training scenario.
 * Later bolts (scales, sessions, tickets) register here so one reset restores everything.
 */
@Injectable()
export class ResetRegistry {
  private readonly logger = new Logger(ResetRegistry.name);
  private readonly modules: ResettableModule[] = [];

  register(module: ResettableModule): void {
    this.modules.push(module);
  }

  /** Seeds every module that has no data yet (application start). */
  seedMissing(): void {
    for (const m of this.modules) {
      if (!m.isSeeded()) {
        m.reset();
        this.logger.log(`Seeded ${m.name}`);
      }
    }
  }

  resetAll(): string[] {
    for (const m of this.modules) m.reset();
    const names = this.modules.map((m) => m.name);
    this.logger.log(`Training scenario reset: ${names.join(', ')}`);
    return names;
  }
}
