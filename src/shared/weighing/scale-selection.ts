export type ScaleClass = 'PRECISION' | 'FLOOR';

/** Threshold between the 3 kg precision scale and the 32 kg floor scale (TD-3, training rule). */
export const SCALE_SELECTION_THRESHOLD_MG = 3_000_000;

/** A component at exactly the threshold uses the precision scale (inclusive boundary). */
export function selectScaleClass(targetMg: number): ScaleClass {
  return targetMg <= SCALE_SELECTION_THRESHOLD_MG ? 'PRECISION' : 'FLOOR';
}
