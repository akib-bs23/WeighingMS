import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DummyPrinterService } from '../../../src/server/integrations/printer/dummy/dummy-printer.service';
import { DummyScaleService } from '../../../src/server/integrations/scale/dummy/dummy-scale.service';
import { createTestApp } from '../../helpers/create-test-app';

const FULL_BATCH_PLAN: [string, number][] = [
  ['scale-3kg', 1_241_500],
  ['scale-3kg', 385_400],
  ['scale-3kg', 94_200],
  ['scale-32kg', 23_980_000],
  ['scale-32kg', 9_621_000],
];

describe('Ticket API', () => {
  let app: INestApplication;
  let scales: DummyScaleService;
  let printer: DummyPrinterService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    scales = app.get(DummyScaleService);
    printer = app.get(DummyPrinterService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await http().post('/api/training/reset').expect(200);
  });

  async function completedSession(): Promise<string> {
    const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
    const sessionId: string = start.body.sessionId;
    for (const [scaleId, mg] of FULL_BATCH_PLAN) {
      scales.setWeight(scaleId, mg);
      await http().post(`/api/sessions/${sessionId}/confirm`).expect(200);
    }
    await http().post(`/api/sessions/${sessionId}/complete`).expect(200);
    return sessionId;
  }

  it('returns 409 BATCH_INCOMPLETE before the batch is completed', async () => {
    const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
    const res = await http().post(`/api/sessions/${start.body.sessionId}/ticket`).expect(409);
    expect(res.body.error.code).toBe('BATCH_INCOMPLETE');
  });

  it('composes and prints the ticket for a completed session', async () => {
    const sessionId = await completedSession();
    const res = await http().post(`/api/sessions/${sessionId}/ticket`).expect(200);
    expect(res.body.status).toBe('PRINTED');
    expect(res.body.ticket).toMatchObject({
      batchId: 'B-24187',
      orderRef: 'SO-9931',
      machineRef: 'JET-04',
      shadeCode: 'Teal 4C',
      toleranceSummary: 'ALL WITHIN TOLERANCE',
      barcodeValue: 'B-24187',
    });
    expect(res.body.ticket.lines).toHaveLength(5);
  });

  it('GET returns 404 TICKET_NOT_FOUND before submit has been called', async () => {
    const sessionId = await completedSession();
    const res = await http().get(`/api/sessions/${sessionId}/ticket`).expect(404);
    expect(res.body.error.code).toBe('TICKET_NOT_FOUND');
  });

  it('GET reflects the submitted ticket after printing', async () => {
    const sessionId = await completedSession();
    const submitted = await http().post(`/api/sessions/${sessionId}/ticket`).expect(200);
    const got = await http().get(`/api/sessions/${sessionId}/ticket`).expect(200);
    expect(got.body).toEqual(submitted.body);
  });

  it('shows the override note instead of ALL WITHIN TOLERANCE when a component was overridden', async () => {
    const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
    const sessionId: string = start.body.sessionId;
    scales.setWeight('scale-3kg', 93_000); // under tolerance
    await http()
      .post(`/api/sessions/${sessionId}/override`)
      .send({ pin: '4825', reason: 'Lab approved' })
      .expect(200);
    for (const [scaleId, mg] of FULL_BATCH_PLAN.slice(1)) {
      scales.setWeight(scaleId, mg);
      await http().post(`/api/sessions/${sessionId}/confirm`).expect(200);
    }
    await http().post(`/api/sessions/${sessionId}/complete`).expect(200);
    const res = await http().post(`/api/sessions/${sessionId}/ticket`).expect(200);
    expect(res.body.ticket.toleranceSummary).toBe('OVERRIDDEN — SEE RECORDS');
  });

  it('retries a PENDING ticket after the printer comes back online', async () => {
    const sessionId = await completedSession();
    printer.setOnline(false);
    const pending = await http().post(`/api/sessions/${sessionId}/ticket`).expect(200);
    expect(pending.body.status).toBe('PENDING');
    printer.setOnline(true);
    const retried = await http().post(`/api/sessions/${sessionId}/ticket/retry`).expect(200);
    expect(retried.body.status).toBe('PRINTED');
  });

  it('reprints a printed ticket, marking it isReprint and auditing it (story 003)', async () => {
    const sessionId = await completedSession();
    await http().post(`/api/sessions/${sessionId}/ticket`).expect(200);
    const reprinted = await http().post(`/api/sessions/${sessionId}/ticket/reprint`).expect(200);
    expect(reprinted.body.isReprint).toBe(true);

    const auditTrail = await http().get(`/api/sessions/${sessionId}/audit`).expect(200);
    expect(auditTrail.body).toHaveLength(1);
    expect(auditTrail.body[0]).toMatchObject({ type: 'REPRINT' });
  });

  it('rejects reprinting a never-printed ticket with 409 TICKET_NOT_PRINTED', async () => {
    const sessionId = await completedSession();
    printer.setOnline(false);
    await http().post(`/api/sessions/${sessionId}/ticket`).expect(200);
    printer.setOnline(true);
    const res = await http().post(`/api/sessions/${sessionId}/ticket/reprint`).expect(409);
    expect(res.body.error.code).toBe('TICKET_NOT_PRINTED');
  });
});
