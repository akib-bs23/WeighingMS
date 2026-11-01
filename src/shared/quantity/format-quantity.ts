import type { Uom } from '../contracts/orgatex';

/** Display precision per unit (prototype: g → 1 decimal, kg → 3 decimals). */
const DECIMALS: Record<Uom, number> = { g: 1, kg: 3 };
const MG_PER_STEP: Record<Uom, number> = { g: 100, kg: 1_000 };

/**
 * Formats integer milligrams in the component's unit using integer arithmetic only
 * (e.g. 1 240 000 mg → "1240.0" g, 24 000 000 mg → "24.000" kg).
 */
export function formatQuantity(mg: number, uom: Uom): string {
  const steps = Math.round(Math.abs(mg) / MG_PER_STEP[uom]);
  const decimals = DECIMALS[uom];
  const digits = String(steps).padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals);
  const sign = mg < 0 && steps > 0 ? '-' : '';
  return `${sign}${whole}.${fraction}`;
}

/** Quantity with its unit, e.g. "94.0 g". */
export function formatWithUnit(mg: number, uom: Uom): string {
  return `${formatQuantity(mg, uom)} ${uom}`;
}
