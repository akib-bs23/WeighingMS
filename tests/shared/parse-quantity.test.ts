import { InvalidQuantityError, parseQuantity } from '../../src/shared/quantity/parse-quantity';
import type { Uom } from '../../src/shared/contracts/orgatex';

describe('parseQuantity', () => {
  it.each([
    ['1240.0', 'g', 1_240_000],
    ['94.0', 'g', 94_000],
    ['0.5', 'g', 500],
    ['0.1', 'g', 100],
    ['214', 'g', 214_000],
    ['3000', 'g', 3_000_000],
    ['24.000', 'kg', 24_000_000],
    ['0.120', 'kg', 120_000],
    ['0.048', 'kg', 48_000],
    ['9.600', 'kg', 9_600_000],
    ['1.850', 'kg', 1_850_000],
    ['0.001', 'kg', 1_000],
    ['0', 'g', 0],
  ] as const)('converts "%s" %s to %i mg', (value, uom, expected) => {
    expect(parseQuantity(value, uom)).toBe(expected);
  });

  it('returns exact integers where float arithmetic would drift', () => {
    // 0.1 + 0.2 style drift: 1.1 kg * 1e6 = 1100000.0000000002 in floating point.
    expect(parseQuantity('1.1', 'kg')).toBe(1_100_000);
    expect(Number.isInteger(parseQuantity('35.322', 'kg'))).toBe(true);
  });

  it.each([
    ['-5', 'g', 'non-negative decimal'],
    ['abc', 'g', 'non-negative decimal'],
    ['', 'g', 'non-negative decimal'],
    ['1e3', 'g', 'non-negative decimal'],
    ['0.0001', 'g', 'more than 3 decimal places'],
    ['0.0000001', 'kg', 'more than 6 decimal places'],
  ] as const)('rejects "%s" %s', (value, uom, reason) => {
    expect(() => parseQuantity(value, uom)).toThrow(InvalidQuantityError);
    expect(() => parseQuantity(value, uom)).toThrow(reason);
  });

  it('rejects values beyond safe integer milligrams', () => {
    expect(() => parseQuantity('99999999999999', 'kg')).toThrow('value too large');
  });

  it('rejects an unknown unit', () => {
    expect(() => parseQuantity('1', 'lb' as Uom)).toThrow('unit must be g or kg');
  });
});
