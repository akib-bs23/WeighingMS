import type { Uom } from '../contracts/orgatex';
import { formatQuantity } from '../quantity/format-quantity';

/** The band around a target within which a weighing may be confirmed. Both ends are inclusive. */
export interface ToleranceBand {
  targetMg: number;
  toleranceMg: number;
  minMg: number;
  maxMg: number;
}

export function toleranceBand(targetMg: number, toleranceMg: number): ToleranceBand {
  return { targetMg, toleranceMg, minMg: targetMg - toleranceMg, maxMg: targetMg + toleranceMg };
}

/** under: well below target · near: approaching · ok: within the inclusive band · over: above it. */
export type Zone = 'UNDER' | 'NEAR' | 'OK' | 'OVER';

/** Fraction of target at which the "near" zone begins (prototype choice, AS-3). */
const NEAR_THRESHOLD = 0.9;

export function evaluateZone(readingMg: number, band: ToleranceBand): Zone {
  if (readingMg > band.maxMg) return 'OVER';
  if (readingMg >= band.minMg) return 'OK';
  if (readingMg >= band.targetMg * NEAR_THRESHOLD) return 'NEAR';
  return 'UNDER';
}

/** How much is still to be dispensed; never negative. */
export function remaining(targetMg: number, readingMg: number): number {
  return Math.max(0, targetMg - readingMg);
}

/**
 * The exact status-line wording for each zone (story 002 AC5). Surplus for OVER is
 * `actual − target` (TD-11, finalised at workbook Step 24) — no recalculation of any other
 * component's target is ever performed; see `evidence/STEP-24-overshoot-decision.md`.
 */
export function statusText(zone: Zone, readingMg: number, band: ToleranceBand, uom: Uom): string {
  if (zone === 'OVER') {
    const surplusMg = readingMg - band.targetMg;
    return `OVER TOLERANCE — SURPLUS +${formatQuantity(surplusMg, uom)} ${uom}`;
  }
  if (zone === 'OK') {
    return 'WITHIN TOLERANCE — PRESS OK TO CONFIRM';
  }
  const remainingMg = remaining(band.targetMg, readingMg);
  return `DISPENSE — ${formatQuantity(remainingMg, uom)} ${uom} REMAINING`;
}
