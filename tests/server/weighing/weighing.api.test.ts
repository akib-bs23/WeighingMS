import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DummyScaleService } from '../../../src/server/integrations/scale/dummy/dummy-scale.service';
import { createTestApp } from '../../helpers/create-test-app';

describe('Weighing session API', () => {
  let app: INestApplication;
  let scales: DummyScaleService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    scales = app.get(DummyScaleService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await http().post('/api/training/reset').expect(200);
  });

  describe('POST /api/sessions', () => {
    it('starts a session for a released batch', async () => {
      const res = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      expect(res.body).toMatchObject({ batchId: 'B-24187', status: 'IN_PROGRESS' });
      expect(res.body.components).toHaveLength(5);
    });

    it('rejects a missing/invalid body with 400 VALIDATION_FAILED', async () => {
      const res1 = await http().post('/api/sessions').send({}).expect(400);
      expect(res1.body.error.code).toBe('VALIDATION_FAILED');
      const res2 = await http().post('/api/sessions').send({ batchId: 42 }).expect(400);
      expect(res2.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects a non-released batch with 409', async () => {
      const res = await http().post('/api/sessions').send({ batchId: 'B-24188' }).expect(409);
      expect(res.body.error.code).toBe('BATCH_NOT_RELEASED');
    });

    it('rejects a second batch while one session is open', async () => {
      await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const res = await http().post('/api/sessions').send({ batchId: 'B-24190' }).expect(409);
      expect(res.body.error.code).toBe('SESSION_ALREADY_OPEN');
    });
  });

  describe('GET /api/sessions/:sessionId', () => {
    it('returns 404 SESSION_NOT_FOUND for an unknown session', async () => {
      const res = await http().get('/api/sessions/nope').expect(404);
      expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('POST /api/sessions/:sessionId/components/:componentId/activate', () => {
    it('activates a pending component, selecting and taring its scale', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const res = await http()
        .post(`/api/sessions/${start.body.sessionId}/components/RC-24187-04/activate`)
        .expect(200);
      expect(res.body.activeComponentId).toBe('RC-24187-04');
      const component = res.body.components.find(
        (c: { componentId: string }) => c.componentId === 'RC-24187-04',
      );
      expect(component).toMatchObject({
        state: 'ACTIVE',
        scaleId: 'scale-32kg',
        tareMg: 1_850_000, // container master tare for D-03
      });
    });

    it('returns 409 COMPONENT_DONE for an already-confirmed component', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      scales.setWeight('scale-3kg', 1_241_500);
      await http().post(`/api/sessions/${start.body.sessionId}/confirm`).expect(200);
      const res = await http()
        .post(`/api/sessions/${start.body.sessionId}/components/RC-24187-01/activate`)
        .expect(409);
      expect(res.body.error.code).toBe('COMPONENT_DONE');
    });

    it('returns 404 COMPONENT_NOT_FOUND for an unknown component', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const res = await http()
        .post(`/api/sessions/${start.body.sessionId}/components/nope/activate`)
        .expect(404);
      expect(res.body.error.code).toBe('COMPONENT_NOT_FOUND');
    });
  });

  describe('POST /api/sessions/:sessionId/retare', () => {
    it('zeroes the active scale and creates no weighing record', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      scales.setWeight('scale-3kg', 50_000);
      const res = await http().post(`/api/sessions/${start.body.sessionId}/retare`).expect(200);
      expect(res.body.activeComponentId).toBe('RC-24187-01');
      const weight = scales.readWeight('scale-3kg');
      expect(weight.netMg).toBe(0);
    });
  });

  it('runs the full five-component B-24187 flow over HTTP, matching the prototype actuals', async () => {
    const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
    const sessionId: string = start.body.sessionId;
    expect(start.body.activeComponentId).toBe('RC-24187-01');

    const plan: [string, number][] = [
      ['scale-3kg', 1_241_500],
      ['scale-3kg', 385_400],
      ['scale-3kg', 94_200],
      ['scale-32kg', 23_980_000],
      ['scale-32kg', 9_621_000],
    ];
    const actuals: number[] = [];
    for (const [scaleId, mg] of plan) {
      scales.setWeight(scaleId, mg);
      const res = await http().post(`/api/sessions/${sessionId}/confirm`).expect(200);
      actuals.push(res.body.record.actualMg);
    }
    expect(actuals).toEqual([1_241_500, 385_400, 94_200, 23_980_000, 9_621_000]);

    const final = await http().get(`/api/sessions/${sessionId}`).expect(200);
    expect(final.body.activeComponentId).toBeNull();
    expect(final.body.components.every((c: { state: string }) => c.state === 'DONE')).toBe(true);
  });

  it('rejects confirm outside tolerance with 422 OUT_OF_TOLERANCE', async () => {
    const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
    scales.setWeight('scale-3kg', 0);
    const res = await http().post(`/api/sessions/${start.body.sessionId}/confirm`).expect(422);
    expect(res.body.error.code).toBe('OUT_OF_TOLERANCE');
  });

  it('activate/retare/confirm ignore any body sent (server is authoritative)', async () => {
    const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
    const sessionId: string = start.body.sessionId;
    scales.setWeight('scale-3kg', 1_241_500);
    // A malicious/buggy client sending a fabricated weight must have no effect.
    const res = await http()
      .post(`/api/sessions/${sessionId}/confirm`)
      .send({ actualMg: 1, result: 'IN_TOLERANCE' })
      .expect(200);
    expect(res.body.record.actualMg).toBe(1_241_500);
  });

  it('propagates SCALE_UNAVAILABLE (503) from activate/retare/confirm', async () => {
    const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
    const sessionId: string = start.body.sessionId;
    await http().put('/api/training/scales/scale-3kg').send({ online: false }).expect(200);
    const res = await http().post(`/api/sessions/${sessionId}/confirm`).expect(503);
    expect(res.body.error.code).toBe('SCALE_UNAVAILABLE');
  });

  describe('POST /api/sessions/:sessionId/identity', () => {
    it('verifies the active component by its own barcode', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const res = await http()
        .post(`/api/sessions/${start.body.sessionId}/identity`)
        .send({ code: 'DYE-1180' })
        .expect(200);
      const active = res.body.components.find(
        (c: { componentId: string }) => c.componentId === 'RC-24187-01',
      );
      expect(active).toMatchObject({ identity: 'VERIFIED', identityMismatchDetail: null });
    });

    it('mismatches on a different dyestuff and blocks confirm with 409', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      await http()
        .post(`/api/sessions/${sessionId}/identity`)
        .send({ code: 'DYE-2204' })
        .expect(200);
      scales.setWeight('scale-3kg', 1_241_500);
      const res = await http().post(`/api/sessions/${sessionId}/confirm`).expect(409);
      expect(res.body.error.code).toBe('IDENTITY_MISMATCH');
    });

    it('rejects a missing body with 400 VALIDATION_FAILED', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const res = await http()
        .post(`/api/sessions/${start.body.sessionId}/identity`)
        .send({})
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('POST /api/sessions/:sessionId/override', () => {
    it('authorises an out-of-tolerance reading with the seeded supervisor PIN and a reason', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      scales.setWeight('scale-3kg', 93_000);
      const res = await http()
        .post(`/api/sessions/${sessionId}/override`)
        .send({ pin: '4825', reason: 'Lab approved' })
        .expect(200);
      expect(res.body.record).toMatchObject({
        result: 'OVERRIDDEN',
        actualMg: 93_000,
        override: { supervisorId: 'SV-001', reason: 'Lab approved' },
      });
    });

    it('returns 401 SUPERVISOR_AUTH_FAILED for a wrong PIN', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      scales.setWeight('scale-3kg', 93_000);
      const res = await http()
        .post(`/api/sessions/${sessionId}/override`)
        .send({ pin: '0000', reason: 'Lab approved' })
        .expect(401);
      expect(res.body.error.code).toBe('SUPERVISOR_AUTH_FAILED');
    });

    it('returns 400 REASON_REQUIRED for a blank reason', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      scales.setWeight('scale-3kg', 93_000);
      const res = await http()
        .post(`/api/sessions/${sessionId}/override`)
        .send({ pin: '4825', reason: '' })
        .expect(400);
      expect(res.body.error.code).toBe('REASON_REQUIRED');
    });

    it('never echoes the submitted PIN back in the response body', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      scales.setWeight('scale-3kg', 93_000);
      const res = await http()
        .post(`/api/sessions/${sessionId}/override`)
        .send({ pin: '4825', reason: 'Lab approved' })
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain('4825');
    });
  });

  describe('POST /api/sessions/:sessionId/quit', () => {
    it('returns the active component to PENDING with a fresh tare and no record', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      scales.setWeight('scale-3kg', 60_000);
      const res = await http().post(`/api/sessions/${sessionId}/quit`).expect(200);
      expect(res.body.activeComponentId).toBeNull();
      const first = res.body.components.find(
        (c: { componentId: string }) => c.componentId === 'RC-24187-01',
      );
      expect(first).toMatchObject({ state: 'PENDING', scaleId: null, tareMg: null });
      const weighings = await http().get(`/api/sessions/${sessionId}/weighings`).expect(200);
      expect(weighings.body).toHaveLength(0);
    });
  });

  describe('GET /api/sessions/:sessionId/weighings and /audit', () => {
    it('lists confirmed weighings and audit events for a session', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      scales.setWeight('scale-3kg', 93_000);
      await http()
        .post(`/api/sessions/${sessionId}/override`)
        .send({ pin: '4825', reason: 'Lab approved' })
        .expect(200);

      const weighings = await http().get(`/api/sessions/${sessionId}/weighings`).expect(200);
      expect(weighings.body).toHaveLength(1);
      expect(weighings.body[0]).toMatchObject({ result: 'OVERRIDDEN' });

      const auditTrail = await http().get(`/api/sessions/${sessionId}/audit`).expect(200);
      expect(auditTrail.body).toHaveLength(1);
      expect(auditTrail.body[0]).toMatchObject({ type: 'OVERRIDE', actorId: 'SV-001' });
    });
  });

  describe('POST /api/sessions/:sessionId/complete and GET .../summary', () => {
    const FULL_BATCH_PLAN: [string, number][] = [
      ['scale-3kg', 1_241_500],
      ['scale-3kg', 385_400],
      ['scale-3kg', 94_200],
      ['scale-32kg', 23_980_000],
      ['scale-32kg', 9_621_000],
    ];

    async function weighAllFive(sessionId: string) {
      for (const [scaleId, mg] of FULL_BATCH_PLAN) {
        scales.setWeight(scaleId, mg);
        await http().post(`/api/sessions/${sessionId}/confirm`).expect(200);
      }
    }

    it('returns 409 BATCH_INCOMPLETE before all 5 components are done', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const res = await http().post(`/api/sessions/${start.body.sessionId}/complete`).expect(409);
      expect(res.body.error.code).toBe('BATCH_INCOMPLETE');
    });

    it('completes with the prototype actuals and triggers a confirmed write-back', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      await weighAllFive(sessionId);

      const res = await http().post(`/api/sessions/${sessionId}/complete`).expect(200);
      expect(res.body.session.status).toBe('COMPLETED');
      expect(res.body.summary).toMatchObject({
        componentsDone: 5,
        componentsTotal: 5,
        allWithinTolerance: true,
        totalDispensedMg: 35_322_100,
        operatorName: 'R. Karim',
      });
      expect(res.body.summary.writeBack).toMatchObject({ status: 'CONFIRMED' });
    });

    it('GET summary works before completion (live progress) and matches after completion', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      scales.setWeight('scale-3kg', 1_241_500);
      await http().post(`/api/sessions/${sessionId}/confirm`).expect(200);

      const partial = await http().get(`/api/sessions/${sessionId}/summary`).expect(200);
      expect(partial.body).toMatchObject({ componentsDone: 1, componentsTotal: 5 });
      expect(partial.body.writeBack).toBeNull();

      for (const [scaleId, mg] of FULL_BATCH_PLAN.slice(1)) {
        scales.setWeight(scaleId, mg);
        await http().post(`/api/sessions/${sessionId}/confirm`).expect(200);
      }
      const completion = await http().post(`/api/sessions/${sessionId}/complete`).expect(200);
      const after = await http().get(`/api/sessions/${sessionId}/summary`).expect(200);
      expect(after.body).toEqual(completion.body.summary);
    });

    it('is idempotent over HTTP: a second POST returns the same summary, one consumption record', async () => {
      const start = await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
      const sessionId: string = start.body.sessionId;
      await weighAllFive(sessionId);
      await http().post(`/api/sessions/${sessionId}/complete`).expect(200);
      const second = await http().post(`/api/sessions/${sessionId}/complete`).expect(200);
      expect(second.body.summary.writeBack.attempts).toBe(1);
    });
  });

  it('responds within a reasonable local latency budget', async () => {
    const started = Date.now();
    await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
    expect(Date.now() - started).toBeLessThan(200);
  });
});
