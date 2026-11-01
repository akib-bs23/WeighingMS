import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ScanEvent, ScanFeed } from '../../../../shared/contracts/devices';
import { CLOCK, type Clock } from '../../../common/clock/clock';
import { DomainError, UnavailableError } from '../../../common/errors/domain-error';
import { ResetRegistry } from '../../../training/reset.registry';

/**
 * Dummy barcode scanner — training substitute. The trainer injects scans; the station reads them
 * from a sequence-numbered feed. Keyboard-wedge entry is handled by the UI separately.
 */
@Injectable()
export class DummyScannerService implements OnModuleInit {
  private events: ScanEvent[] = [];
  private seq = 0;
  private online = true;

  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly registry: ResetRegistry,
  ) {}

  onModuleInit(): void {
    // In-memory only: nothing to seed, so it always reports seeded and resets on demand.
    this.registry.register({
      name: 'dummy-scanner',
      isSeeded: () => true,
      reset: () => {
        this.events = [];
        this.seq = 0;
        this.online = true;
      },
    });
  }

  inject(rawCode: string): ScanEvent {
    this.assertOnline();
    const code = rawCode.trim();
    if (code.length === 0) {
      throw new DomainError('INVALID_SCAN', 'Scanned code is empty', 400);
    }
    this.seq += 1;
    const event = { seq: this.seq, code, scannedAt: new Date(this.clock.now()).toISOString() };
    this.events.push(event);
    return event;
  }

  feed(sinceSeq = 0): ScanFeed {
    this.assertOnline();
    return { events: this.events.filter((e) => e.seq > sinceSeq), lastSeq: this.seq };
  }

  isOnline(): boolean {
    return this.online;
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  private assertOnline(): void {
    if (!this.online) {
      throw new UnavailableError('SCANNER_UNAVAILABLE', 'Scanner is not responding');
    }
  }
}
