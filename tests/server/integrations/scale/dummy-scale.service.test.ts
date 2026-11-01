import type { INestApplication } from '@nestjs/common';
import {
  DEFAULT_RAMP_MS,
  DummyScaleService,
} from '../../../../src/server/integrations/scale/dummy/dummy-scale.service';
import { ResetRegistry } from '../../../../src/server/training/reset.registry';
import { createTestApp, FakeClock } from '../../../helpers/create-test-app';

/** Simulated pour behaviour, stepped with a fake clock. */
describe('DummyScaleService pour simulation', () => {
  let app: INestApplication;
  let scales: DummyScaleService;
  const clock = new FakeClock();
  const read = () => scales.readWeight('scale-3kg');

  beforeAll(async () => {
    app = await createTestApp({ clock });
    scales = app.get(DummyScaleService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    app.get(ResetRegistry).resetAll();
  });

  it('rises monotonically, unstable, and lands exactly on the target', () => {
    scales.startRamp('scale-3kg', 94_200, 3_000);
    const samples: { netMg: number | null; stable: boolean }[] = [];
    for (let t = 0; t < 3_000; t += 250) {
      samples.push(read());
      clock.advance(250);
    }
    const values = samples.map((s) => s.netMg ?? -1);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(samples.every((s) => !s.stable)).toBe(true);
    expect(read()).toMatchObject({ netMg: 94_200, stable: true });
    clock.advance(10_000);
    expect(read()).toMatchObject({ netMg: 94_200, stable: true });
  });

  it('eases out: fast first, slower near the target', () => {
    scales.startRamp('scale-3kg', 100_000, 2_000);
    clock.advance(1_000);
    // Ease-out cubic at 50 % time = 87.5 % of the distance.
    expect(read().netMg).toBe(87_500);
    clock.advance(500);
    // 75 % time → 98.4375 % → 98 437.5 mg, rounded to the 0.1 g resolution.
    expect(read().netMg).toBe(98_400);
  });

  it('rounds intermediate values to the scale resolution', () => {
    scales.startRamp('scale-3kg', 94_200, 3_000);
    for (let i = 0; i < 12; i++) {
      clock.advance(250);
      expect((read().netMg ?? 0) % 100).toBe(0);
    }
  });

  it('pours from the current net weight, also downwards', () => {
    scales.setWeight('scale-3kg', 50_000);
    scales.startRamp('scale-3kg', 20_000, 1_000);
    expect(read().netMg).toBe(50_000);
    clock.advance(1_000);
    expect(read()).toMatchObject({ netMg: 20_000, stable: true });
  });

  it('uses a 3 s default duration', () => {
    scales.startRamp('scale-3kg', 10_000);
    clock.advance(DEFAULT_RAMP_MS - 1);
    expect(read().stable).toBe(false);
    clock.advance(1);
    expect(read()).toMatchObject({ netMg: 10_000, stable: true });
  });

  it('tare during a pour re-bases it on the new zero for the remaining time', () => {
    scales.startRamp('scale-3kg', 100_000, 2_000);
    clock.advance(1_000);
    expect(read().netMg).toBe(87_500);
    expect(scales.tare('scale-3kg')).toMatchObject({ tareMg: 87_500, netMg: 0 });
    expect(read().netMg).toBe(0);
    clock.advance(1_000);
    expect(read()).toMatchObject({ netMg: 12_500, stable: true });
  });

  it('starts a pour from zero after a fault', () => {
    scales.setFault('scale-3kg', 'NO_READING');
    scales.startRamp('scale-3kg', 5_000, 1_000);
    expect(read()).toMatchObject({ netMg: 0, error: null });
    clock.advance(1_000);
    expect(read().netMg).toBe(5_000);
  });

  it('stamps readings with the clock time', () => {
    expect(read().readAt).toBe(new Date(clock.now()).toISOString());
  });
});
