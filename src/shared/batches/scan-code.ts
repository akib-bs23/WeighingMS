export type ScanKind = 'BATCH' | 'DYESTUFF' | 'UNKNOWN';

const BATCH_CARD = /^B-\d+$/;
const DYESTUFF = /^(?:DYE|AUX)-\d+$/;

/**
 * Recognises what a scanned code is: a batch card (Screen 1) or a dyestuff barcode (identity
 * check, FR-7). Training formats from the seed; real barcode formats are unknown (A-10).
 */
export function classifyScan(rawCode: string): ScanKind {
  const code = rawCode.trim();
  if (BATCH_CARD.test(code)) return 'BATCH';
  if (DYESTUFF.test(code)) return 'DYESTUFF';
  return 'UNKNOWN';
}
