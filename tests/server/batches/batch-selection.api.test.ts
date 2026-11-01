import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { BatchSelection } from '../../../src/shared/contracts/station';
import { createTestApp } from '../../helpers/create-test-app';

describe('POST /api/station/batch-selection', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const select = (body: object) => http().post('/api/station/batch-selection').send(body);

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await http().post('/api/training/reset').expect(200);
  });

  it('returns batch and recipe for B-24187 within 3 s (NFR-2)', async () => {
    const started = Date.now();
    const res = await select({ code: 'B-24187' }).expect(200);
    expect(Date.now() - started).toBeLessThan(3_000);
    const body = res.body as BatchSelection;
    expect(body.batch).toMatchObject({
      batchId: 'B-24187',
      orderRef: 'SO-9931',
      machineRef: 'JET-04',
      shadeCode: 'Teal 4C',
    });
    expect(body.recipe.components.map((c) => c.sequence)).toEqual([1, 2, 3, 4, 5]);
  });

  it.each([
    ['B-24188', 409, 'BATCH_NOT_RELEASED', 'Batch B-24188 not released by OrgaTEX (status QUEUED)'],
    ['B-24190', 409, 'BATCH_NOT_RELEASED', 'Batch B-24190 not released by OrgaTEX (status QUEUED)'],
    ['B-99999', 404, 'BATCH_NOT_FOUND', 'Batch B-99999 not found'],
    ['DYE-4471', 422, 'NOT_A_BATCH_CODE', 'DYE-4471 is not a batch card'],
    ['', 400, 'VALIDATION_FAILED', 'Batch code is required'],
  ])('%j → %i %s', async (code, status, errorCode, message) => {
    const res = await select({ code }).expect(status);
    expect(res.body.error).toMatchObject({ code: errorCode, message });
  });

  it.each([{}, { code: 42 }, { code: 'B-24187', extra: true }])(
    'rejects malformed body %j with 400',
    async (body) => {
      const res = await select(body).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    },
  );

  it('returns 503 ORGATEX_UNAVAILABLE when OrgaTEX is offline, then recovers', async () => {
    await http().put('/api/training/orgatex').send({ online: false }).expect(200);
    const res = await select({ code: 'B-24187' }).expect(503);
    expect(res.body.error.code).toBe('ORGATEX_UNAVAILABLE');
    await http().put('/api/training/orgatex').send({ online: true }).expect(200);
    await select({ code: 'B-24187' }).expect(200);
  });
});
