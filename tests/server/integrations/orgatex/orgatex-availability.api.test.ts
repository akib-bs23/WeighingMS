import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../../helpers/create-test-app';

describe('Dummy OrgaTEX availability toggle', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const setOnline = (online: boolean) => http().put('/api/training/orgatex').send({ online });

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(async () => {
    await setOnline(true);
  });

  it('reports online with no contact yet after start', async () => {
    const res = await http().get('/api/training/orgatex').expect(200);
    expect(res.body).toEqual({ online: true, lastServedAt: null });
  });

  it('returns 503 ORGATEX_UNAVAILABLE on all three endpoints when offline', async () => {
    await setOnline(false).expect(200, { online: false, lastServedAt: null });
    for (const path of ['/api/batches', '/api/batches/B-24187', '/api/batches/B-24187/recipe']) {
      const res = await http().get(path).expect(503);
      expect(res.body).toEqual({
        error: { code: 'ORGATEX_UNAVAILABLE', message: 'OrgaTEX is unavailable' },
      });
    }
  });

  it('resumes normal responses when set back online', async () => {
    await setOnline(false);
    await http().get('/api/batches').expect(503);
    await setOnline(true).expect(200);
    await http().get('/api/batches').expect(200);
  });

  it('records the time of the last successful response', async () => {
    const before = Date.now();
    await http().get('/api/batches/B-24187').expect(200);
    const res = await http().get('/api/training/orgatex').expect(200);
    const served = Date.parse((res.body as { lastServedAt: string }).lastServedAt);
    expect(served).toBeGreaterThanOrEqual(before - 5);
  });

  it.each([{ online: 'no' }, {}, { online: true, extra: 1 }])(
    'rejects invalid body %j with 400 VALIDATION_FAILED',
    async (body) => {
      const res = await http().put('/api/training/orgatex').send(body).expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    },
  );
});
