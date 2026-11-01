import { classifyReading } from '../../../src/shared/weighing/reading-safety';

describe('classifyReading', () => {
  const CAPACITY_MG = 3_000_000; // scale-3kg

  it.each([0, 1, 1_500_000, CAPACITY_MG])('treats %i mg (within capacity) as VALID', (mg) => {
    expect(classifyReading(mg, CAPACITY_MG)).toBe('VALID');
  });

  it('treats a negative reading as INVALID', () => {
    expect(classifyReading(-5_000, CAPACITY_MG)).toBe('INVALID');
  });

  it('treats a reading over capacity as INVALID (3 500 g on a 3 000 g scale)', () => {
    expect(classifyReading(3_500_000, CAPACITY_MG)).toBe('INVALID');
  });

  it('treats exactly-at-capacity as VALID (inclusive boundary)', () => {
    expect(classifyReading(CAPACITY_MG, CAPACITY_MG)).toBe('VALID');
  });

  it('treats one mg over capacity as INVALID', () => {
    expect(classifyReading(CAPACITY_MG + 1, CAPACITY_MG)).toBe('INVALID');
  });
});
