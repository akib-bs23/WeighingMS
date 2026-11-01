import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/server/app.module';
import { configureApp } from '../../src/server/app.setup';
import { CLOCK, type Clock } from '../../src/server/common/clock/clock';

export interface TestAppOptions {
  /** Replaces the system clock (e.g. to step through a simulated pour). */
  clock?: Clock;
}

/** Boots the full API against a fresh in-memory SQLite database seeded from data/seed.json. */
export async function createTestApp(options: TestAppOptions = {}): Promise<INestApplication> {
  process.env.WEIGHINGMS_DB = ':memory:';
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (options.clock) builder.overrideProvider(CLOCK).useValue(options.clock);
  const moduleRef = await builder.compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.init();
  return app;
}

/** A clock the test moves by hand. */
export class FakeClock implements Clock {
  constructor(private t = Date.parse('2026-10-29T08:00:00Z')) {}

  now(): number {
    return this.t;
  }

  advance(ms: number): void {
    this.t += ms;
  }
}
