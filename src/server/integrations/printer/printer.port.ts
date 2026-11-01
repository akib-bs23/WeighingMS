import type { PrintJobResult, PrintTicketRequest } from '../../../shared/contracts/devices';

/**
 * The only way WeighingMS talks to the ticket printer (brief IR-16). Bound to the Dummy adapter
 * for training; a real printer driver would implement the same interface.
 *
 * Implementations throw `UnavailableError('PRINTER_UNAVAILABLE')` when the printer does not
 * respond.
 */
export interface PrinterPort {
  print(request: PrintTicketRequest): Promise<PrintJobResult>;
  isOnline(): boolean;
}

export const PRINTER_PORT = Symbol('PRINTER_PORT');
