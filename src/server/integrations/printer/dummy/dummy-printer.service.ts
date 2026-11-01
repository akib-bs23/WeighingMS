import { randomUUID } from 'node:crypto';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { PrintJobResult, PrintTicketRequest } from '../../../../shared/contracts/devices';
import { DomainError, UnavailableError } from '../../../common/errors/domain-error';
import { ResetRegistry } from '../../../training/reset.registry';

/**
 * Dummy ticket printer — training substitute. In-memory only (like the Dummy scanner): it knows
 * nothing about "tickets" as a business concept, just prints lines of text and a barcode value
 * under a caller-given id.
 */
@Injectable()
export class DummyPrinterService implements OnModuleInit {
  private online = true;

  constructor(private readonly registry: ResetRegistry) {}

  onModuleInit(): void {
    // In-memory only: nothing to seed, so it always reports seeded and resets on demand.
    this.registry.register({
      name: 'dummy-printer',
      isSeeded: () => true,
      reset: () => {
        this.online = true;
      },
    });
  }

  print(request: PrintTicketRequest): PrintJobResult {
    this.assertOnline();
    if (request.barcodeValue.trim().length === 0) {
      throw new DomainError('INVALID_TICKET', 'barcodeValue is required', 400);
    }
    return {
      jobId: randomUUID(),
      ticketId: request.ticketId,
      status: 'PRINTED',
      renderedLines: request.lines,
    };
  }

  isOnline(): boolean {
    return this.online;
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  private assertOnline(): void {
    if (!this.online) {
      throw new UnavailableError('PRINTER_UNAVAILABLE', 'Printer is not responding');
    }
  }
}
