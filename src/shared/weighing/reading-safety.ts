export type ReadingValidity = 'VALID' | 'INVALID';

/**
 * Classifies a *stable, present* numeric reading as `INVALID` when it is negative or exceeds
 * the scale's capacity — the "present but physically impossible" cases a scale can still report
 * (story 006 AC2: e.g. −5 g, or 3 500 g on a 3 000 g scale). A missing or unstable reading is a
 * different, already-handled case (`READING_UNSTABLE`) and is never passed to this function.
 */
export function classifyReading(netMg: number, capacityMg: number): ReadingValidity {
  return netMg < 0 || netMg > capacityMg ? 'INVALID' : 'VALID';
}
