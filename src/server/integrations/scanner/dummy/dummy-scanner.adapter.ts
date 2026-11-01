import { Injectable } from '@nestjs/common';
import type { ScanFeed } from '../../../../shared/contracts/devices';
import { settle } from '../../../common/async/settle';
import type { ScannerPort } from '../scanner.port';
import { DummyScannerService } from './dummy-scanner.service';

/** ScannerPort backed by the in-process Dummy scanner; errors propagate unchanged. */
@Injectable()
export class DummyScannerAdapter implements ScannerPort {
  constructor(private readonly dummy: DummyScannerService) {}

  readEvents(sinceSeq: number): Promise<ScanFeed> {
    return settle(() => this.dummy.feed(sinceSeq));
  }

  isOnline(): boolean {
    return this.dummy.isOnline();
  }
}
