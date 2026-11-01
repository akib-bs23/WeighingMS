import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';

describe('GET /api/station', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('returns the station and the seeded training operator', async () => {
    const res = await request(app.getHttpServer()).get('/api/station').expect(200);
    expect(res.body).toEqual({
      stationId: 'STN-01',
      name: 'Weighing Station 01',
      operator: { operatorId: 'OP-001', name: 'R. Karim', shift: 'Shift A' },
    });
  });

  it('never exposes a PIN hash', async () => {
    const res = await request(app.getHttpServer()).get('/api/station').expect(200);
    expect(JSON.stringify(res.body)).not.toMatch(/pin/i);
  });
});
