import { formatQuantity, formatWithUnit } from '../../src/shared/quantity/format-quantity';

describe('formatQuantity', () => {
  it.each([
    [1_240_000, 'g', '1240.0'],
    [386_000, 'g', '386.0'],
    [94_000, 'g', '94.0'],
    [500, 'g', '0.5'],
    [0, 'g', '0.0'],
    [24_000_000, 'kg', '24.000'],
    [9_600_000, 'kg', '9.600'],
    [1_850_000, 'kg', '1.850'],
    [48_000, 'kg', '0.048'],
  ] as const)('formats %i mg (%s) as "%s"', (mg, uom, expected) => {
    expect(formatQuantity(mg, uom)).toBe(expected);
  });

  it('formats a negative value with a leading minus (invalid reading, not confirmable)', () => {
    expect(formatQuantity(-5_000, 'g')).toBe('-5.0');
  });
});

describe('formatWithUnit', () => {
  it('appends the unit after the formatted number', () => {
    expect(formatWithUnit(94_000, 'g')).toBe('94.0 g');
    expect(formatWithUnit(24_000_000, 'kg')).toBe('24.000 kg');
  });
});
