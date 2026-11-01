import type { ScanFeed } from '../../../shared/contracts/devices';

/**
 * The only way WeighingMS reads the barcode scanner (brief IR-15). Bound to the Dummy adapter for
 * training. Implementations throw `UnavailableError('SCANNER_UNAVAILABLE')` when the scanner is
 * not responding.
 */
export interface ScannerPort {
  readEvents(sinceSeq: number): Promise<ScanFeed>;
  isOnline(): boolean;
}

export const SCANNER_PORT = Symbol('SCANNER_PORT');
