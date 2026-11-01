import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../../helpers/create-test-app';

describe('Dummy Printer API', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const print = (body: Record<string, unknown>) => http().post('/api/tickets').send(body);
  const setOnline = (online: boolean) =>
    http().put('/api/training/printer').send({ online }).expect(200);

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await http().post('/api/training/reset').expect(200);
  });

  it('reports online status', async () => {
    await http().get('/api/printer/status').expect(200, { online: true });
  });

  it('prints a ticket payload and echoes the lines (story 001 AC1)', async () => {
    const res = await print({
      ticketId: 'tkt-1',
      lines: ['FCI DYEING — WEIGHING TICKET', 'BATCH B-24187'],
      barcodeValue: 'B-24187',
    }).expect(201);
    expect(res.body).toMatchObject({
      ticketId: 'tkt-1',
      status: 'PRINTED',
      renderedLines: ['FCI DYEING — WEIGHING TICKET', 'BATCH B-24187'],
    });
    expect(typeof res.body.jobId).toBe('string');
  });

  it('returns 503 PRINTER_UNAVAILABLE when offline (story 001 AC2)', async () => {
    await setOnline(false);
    const res = await print({ ticketId: 'tkt-1', lines: ['x'], barcodeValue: 'B-24187' }).expect(
      503,
    );
    expect(res.body.error.code).toBe('PRINTER_UNAVAILABLE');
  });

  it('rejects a missing barcodeValue with 400 (story 001 edge case)', async () => {
    const res = await print({ ticketId: 'tkt-1', lines: ['x'], barcodeValue: '' }).expect(400);
    expect(res.body.error.code).toBe('INVALID_TICKET');
  });

  it('rejects a missing body with 400 VALIDATION_FAILED', async () => {
    const res = await print({}).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('training toggle reports and restores availability', async () => {
    await setOnline(false);
    await http().get('/api/printer/status').expect(200, { online: false });
    await setOnline(true);
    await http().get('/api/printer/status').expect(200, { online: true });
  });

  it('reset restores the printer online', async () => {
    await setOnline(false);
    await http().post('/api/training/reset').expect(200);
    await http().get('/api/printer/status').expect(200, { online: true });
  });
});
