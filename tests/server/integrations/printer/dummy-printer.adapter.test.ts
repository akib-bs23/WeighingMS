import type { INestApplication } from '@nestjs/common';
import { DummyPrinterService } from '../../../../src/server/integrations/printer/dummy/dummy-printer.service';
import {
  PRINTER_PORT,
  type PrinterPort,
} from '../../../../src/server/integrations/printer/printer.port';
import { ResetRegistry } from '../../../../src/server/training/reset.registry';
import { createTestApp } from '../../../helpers/create-test-app';

describe('PrinterPort (Dummy adapter)', () => {
  let app: INestApplication;
  let port: PrinterPort;
  let dummy: DummyPrinterService;

  beforeAll(async () => {
    app = await createTestApp();
    port = app.get<PrinterPort>(PRINTER_PORT);
    dummy = app.get(DummyPrinterService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    app.get(ResetRegistry).resetAll();
  });

  it('is bound through dependency injection', () => {
    expect(port.constructor.name).toBe('DummyPrinterAdapter');
  });

  it('prints and echoes the submitted lines', async () => {
    const result = await port.print({
      ticketId: 'tkt-1',
      lines: ['FCI DYEING — WEIGHING TICKET', 'BATCH B-24187'],
      barcodeValue: 'B-24187',
    });
    expect(result).toMatchObject({
      ticketId: 'tkt-1',
      status: 'PRINTED',
      renderedLines: ['FCI DYEING — WEIGHING TICKET', 'BATCH B-24187'],
    });
    expect(typeof result.jobId).toBe('string');
  });

  it('reports availability and rejects with PRINTER_UNAVAILABLE when offline', async () => {
    expect(port.isOnline()).toBe(true);
    dummy.setOnline(false);
    expect(port.isOnline()).toBe(false);
    await expect(
      port.print({ ticketId: 'tkt-1', lines: ['x'], barcodeValue: 'B-24187' }),
    ).rejects.toMatchObject({ code: 'PRINTER_UNAVAILABLE', httpStatus: 503 });
  });
});
