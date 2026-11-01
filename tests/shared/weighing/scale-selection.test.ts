import {
  selectScaleClass,
  SCALE_SELECTION_THRESHOLD_MG,
} from '../../../src/shared/weighing/scale-selection';

describe('selectScaleClass', () => {
  it.each([
    [1_240_000, 'PRECISION'], // Blue RSPL
    [386_000, 'PRECISION'], // Red RB
    [94_000, 'PRECISION'], // Yellow RGB
    [24_000_000, 'FLOOR'], // Sodium Sulphate
    [9_600_000, 'FLOOR'], // Soda Ash
  ] as const)('target %i mg -> %s', (targetMg, expected) => {
    expect(selectScaleClass(targetMg)).toBe(expected);
  });

  it('is inclusive of the threshold on the precision side (story 003 unit test)', () => {
    expect(selectScaleClass(SCALE_SELECTION_THRESHOLD_MG)).toBe('PRECISION');
    expect(selectScaleClass(SCALE_SELECTION_THRESHOLD_MG + 1)).toBe('FLOOR');
  });
});
