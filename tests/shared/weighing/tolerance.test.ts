import {
  evaluateZone,
  remaining,
  statusText,
  toleranceBand,
} from '../../../src/shared/weighing/tolerance';

describe('toleranceBand', () => {
  it('derives an inclusive band from target and tolerance', () => {
    expect(toleranceBand(94_000, 500)).toEqual({
      targetMg: 94_000,
      toleranceMg: 500,
      minMg: 93_500,
      maxMg: 94_500,
    });
  });

  it('a zero tolerance bands exactly the target (edge case, story 002)', () => {
    const band = toleranceBand(100_000, 0);
    expect(band).toEqual({ targetMg: 100_000, toleranceMg: 0, minMg: 100_000, maxMg: 100_000 });
  });
});

describe('evaluateZone (Yellow RGB: target 94.0 g, tolerance ±0.5 g — workbook Step 22)', () => {
  const band = toleranceBand(94_000, 500);

  it.each([
    [93_400, 'NEAR'],
    [93_500, 'OK'],
    [94_000, 'OK'],
    [94_500, 'OK'],
    [94_600, 'OVER'],
  ] as const)('%i mg -> %s', (mg, zone) => {
    expect(evaluateZone(mg, band)).toBe(zone);
  });

  it.each([
    [84_600, 'NEAR'], // 90% of target
    [84_500, 'UNDER'],
    [0, 'UNDER'],
  ] as const)('near/under boundary: %i mg -> %s', (mg, zone) => {
    expect(evaluateZone(mg, band)).toBe(zone);
  });

  it('a zero-tolerance band is still inclusive at exactly the target', () => {
    const exact = toleranceBand(100_000, 0);
    expect(evaluateZone(100_000, exact)).toBe('OK');
    expect(evaluateZone(100_001, exact)).toBe('OVER');
  });
});

describe('remaining', () => {
  it.each([
    [94_000, 60_000, 34_000],
    [94_000, 96_000, 0], // never negative
    [94_000, 94_000, 0],
  ])('target %i, reading %i -> %i', (target, reading, expected) => {
    expect(remaining(target, reading)).toBe(expected);
  });
});

describe('statusText (exact wording, story 002 AC5)', () => {
  const band = toleranceBand(94_000, 500);

  it('under/near: DISPENSE — remaining REMAINING', () => {
    expect(statusText('NEAR', 93_400, band, 'g')).toBe('DISPENSE — 0.6 g REMAINING');
    expect(statusText('UNDER', 60_000, band, 'g')).toBe('DISPENSE — 34.0 g REMAINING');
  });

  it('ok: WITHIN TOLERANCE — PRESS OK TO CONFIRM', () => {
    expect(statusText('OK', 94_200, band, 'g')).toBe('WITHIN TOLERANCE — PRESS OK TO CONFIRM');
  });

  it('over: OVER TOLERANCE — SURPLUS +x REMAINING, measured from target', () => {
    expect(statusText('OVER', 94_600, band, 'g')).toBe('OVER TOLERANCE — SURPLUS +0.6 g');
  });

  it('formats kg components to 3 decimals', () => {
    const kgBand = toleranceBand(24_000_000, 120_000);
    expect(statusText('UNDER', 20_000_000, kgBand, 'kg')).toBe('DISPENSE — 4.000 kg REMAINING');
  });
});
