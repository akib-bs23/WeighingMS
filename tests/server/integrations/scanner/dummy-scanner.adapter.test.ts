import type { INestApplication } from '@nestjs/common';
import { DummyScannerService } from '../../../../src/server/integrations/scanner/dummy/dummy-scanner.service';
import {
  SCANNER_PORT,
  type ScannerPort,
} from '../../../../src/server/integrations/scanner/scanner.port';
import { ResetRegistry } from '../../../../src/server/training/reset.registry';
import { createTestApp } from '../../../helpers/create-test-app';

describe('ScannerPort (Dummy adapter)', () => {
  let app: INestApplication;
  let port: ScannerPort;
  let dummy: DummyScannerService;

  beforeAll(async () => {
    app = await createTestApp();
    port = app.get<ScannerPort>(SCANNER_PORT);
    dummy = app.get(DummyScannerService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    app.get(ResetRegistry).resetAll();
  });

  it('is bound through dependency injection', () => {
    expect(port.constructor.name).toBe('DummyScannerAdapter');
  });

  it('reads injected scans after a sequence number', async () => {
    dummy.inject('B-24187');
    dummy.inject('DYE-4471');
    const feed = await port.readEvents(1);
    expect(feed.events.map((e) => e.code)).toEqual(['DYE-4471']);
    expect(feed.lastSeq).toBe(2);
  });

  it('reports availability and rejects with SCANNER_UNAVAILABLE when offline', async () => {
    expect(port.isOnline()).toBe(true);
    dummy.setOnline(false);
    expect(port.isOnline()).toBe(false);
    await expect(port.readEvents(0)).rejects.toMatchObject({
      code: 'SCANNER_UNAVAILABLE',
      httpStatus: 503,
    });
  });
});
