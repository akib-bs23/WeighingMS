import type { Uom } from '../contracts/orgatex';

/** Milligrams per display unit. */
const MG_PER_UNIT: Record<Uom, number> = { g: 1_000, kg: 1_000_000 };

/** Decimal places that still resolve to whole milligrams. */
const MAX_DECIMALS: Record<Uom, number> = { g: 3, kg: 6 };

const DECIMAL_PATTERN = /^(\d+)(?:\.(\d+))?$/;

export class InvalidQuantityError extends Error {
  constructor(value: string, uom: string, reason: string) {
    super(`Invalid quantity "${value}" ${uom}: ${reason}`);
    this.name = 'InvalidQuantityError';
  }
}

/**
 * Converts a non-negative decimal string in g or kg to integer milligrams using string
 * arithmetic only, so no floating-point rounding can occur (brief NFR-16, NFR-8).
 */
export function parseQuantity(value: string, uom: Uom): number {
  // Guards callers that pass unchecked JSON despite the type.
  if (!(uom in MG_PER_UNIT)) {
    throw new InvalidQuantityError(value, uom, 'unit must be g or kg');
  }
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match) {
    throw new InvalidQuantityError(value, uom, 'expected a non-negative decimal number');
  }
  const [, whole = '0', fraction = ''] = match;
  const decimals = MAX_DECIMALS[uom];
  if (fraction.length > decimals) {
    throw new InvalidQuantityError(value, uom, `more than ${decimals} decimal places`);
  }
  // MAX_DECIMALS is chosen so the padded fraction digits are exactly the milligram remainder.
  const fractionMg = Number(fraction.padEnd(decimals, '0'));
  const mg = Number(whole) * MG_PER_UNIT[uom] + fractionMg;
  if (!Number.isSafeInteger(mg)) {
    throw new InvalidQuantityError(value, uom, 'value too large');
  }
  return mg;
}
