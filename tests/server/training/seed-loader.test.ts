import { readFileSync } from 'node:fs';
import {
  parseTrainingSeed,
  SeedValidationError,
} from '../../../src/server/training/seed/seed-schema';
import { SeedService } from '../../../src/server/training/seed/seed.service';

const rawSeed = (): Record<string, any> =>
  JSON.parse(readFileSync('data/seed.json', 'utf8')) as Record<string, any>;

describe('training seed', () => {
  const seed = SeedService.load('data/seed.json');

  it('loads the prototype scenario', () => {
    expect(seed.station).toEqual({ stationId: 'STN-01', name: 'Weighing Station 01' });
    expect(seed.orgatex.batches.map((b) => `${b.batchId}:${b.status}`)).toEqual([
      'B-24187:RELEASED',
      'B-24188:QUEUED',
      'B-24190:QUEUED',
      'B-24191:QUEUED',
    ]);
    expect(seed.orgatex.recipes).toHaveLength(1);
  });

  it('converts recipe quantities to integer milligrams', () => {
    const components = seed.orgatex.recipes[0]?.components ?? [];
    expect(
      components.map((c) => [c.dyestuffCode, c.uom, c.targetMg, c.toleranceMg, c.displayMaxMg]),
    ).toEqual([
      ['DYE-1180', 'g', 1_240_000, 6_000, 1_600_000],
      ['DYE-2204', 'g', 386_000, 2_000, 520_000],
      ['DYE-4471', 'g', 94_000, 500, 125_000],
      ['AUX-0101', 'kg', 24_000_000, 120_000, 32_000_000],
      ['AUX-0107', 'kg', 9_600_000, 48_000, 14_000_000],
    ]);
  });

  it('converts containers and scales to milligrams', () => {
    expect(seed.containers.find((c) => c.containerId === 'C-12')?.tareMg).toBe(214_000);
    expect(seed.containers.find((c) => c.containerId === 'D-03')?.tareMg).toBe(1_850_000);
    expect(seed.scales.map((s) => [s.scaleId, s.capacityMg, s.resolutionMg])).toEqual([
      ['scale-3kg', 3_000_000, 100],
      ['scale-32kg', 32_000_000, 1_000],
    ]);
  });

  it('stores the supervisor PIN only as a hash', () => {
    const supervisor = seed.operators.find((o) => o.role === 'SUPERVISOR');
    expect(supervisor?.pinHash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    // The training PIN this hash verifies against (documented in bolt 008's
    // implementation-walkthrough.md) must never appear in the seed file itself.
    expect(JSON.stringify(rawSeed())).not.toContain('4825');
  });

  it('rejects a component that references an unknown dyestuff', () => {
    const raw = rawSeed();
    raw.orgatex.recipes[0].components[0].dyestuffCode = 'DYE-0000';
    expect(() => parseTrainingSeed(raw)).toThrow('unknown dyestuff DYE-0000');
  });

  it('rejects quantities with too many decimals', () => {
    const raw = rawSeed();
    raw.orgatex.recipes[0].components[2].target = '94.0001';
    expect(() => parseTrainingSeed(raw)).toThrow(SeedValidationError);
  });

  it('rejects a batch whose component count does not match its recipe', () => {
    const raw = rawSeed();
    raw.orgatex.batches[0].componentCount = 4;
    expect(() => parseTrainingSeed(raw)).toThrow('componentCount 4 does not match recipe (5)');
  });

  it('rejects duplicate component sequence numbers', () => {
    const raw = rawSeed();
    raw.orgatex.recipes[0].components[1].sequence = 1;
    expect(() => parseTrainingSeed(raw)).toThrow('sequence numbers must be unique');
  });

  it('rejects an unknown batch status', () => {
    const raw = rawSeed();
    raw.orgatex.batches[0].status = 'DONE';
    expect(() => parseTrainingSeed(raw)).toThrow('expected one of QUEUED');
  });

  it('rejects a zero target', () => {
    const raw = rawSeed();
    raw.orgatex.recipes[0].components[0].target = '0';
    expect(() => parseTrainingSeed(raw)).toThrow('must be greater than 0');
  });
});
