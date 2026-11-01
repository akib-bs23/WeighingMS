import { Injectable } from '@nestjs/common';
import type { PrintJobResult, PrintTicketRequest } from '../../../../shared/contracts/devices';
import { settle } from '../../../common/async/settle';
import type { PrinterPort } from '../printer.port';
import { DummyPrinterService } from './dummy-printer.service';

/** PrinterPort backed by the in-process Dummy printer; errors propagate unchanged. */
@Injectable()
export class DummyPrinterAdapter implements PrinterPort {
  constructor(private readonly dummy: DummyPrinterService) {}

  print(request: PrintTicketRequest): Promise<PrintJobResult> {
    return settle(() => this.dummy.print(request));
  }

  isOnline(): boolean {
    return this.dummy.isOnline();
  }
}
