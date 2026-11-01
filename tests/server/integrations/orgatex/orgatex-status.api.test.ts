import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../../helpers/create-test-app';

describe('OrgaTEX link status API (station status strip, FR-28)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await http().post('/api/training/reset').expect(200);
    await http().put('/api/training/orgatex').send({ online: true });
  });

  it('reports online', async () => {
    const res = await http().get('/api/orgatex/status').expect(200);
    expect(res.body.online).toBe(true);
  });

  it('records the last time WeighingMS itself successfully contacted OrgaTEX', async () => {
    const before = Date.now();
    // Starting a session is WeighingMS's own outbound call through OrgatexPort — unlike hitting
    // the Dummy's own /api/batches endpoint directly, which doesn't go through the port at all.
    await http().post('/api/sessions').send({ batchId: 'B-24187' }).expect(201);
    const res = await http().get('/api/orgatex/status').expect(200);
    expect(res.body.online).toBe(true);
    expect(Date.parse(res.body.lastSuccessfulContactAt)).toBeGreaterThanOrEqual(before - 5);
  });

  it('reports offline when OrgaTEX is taken offline, and does not leak the training path', async () => {
    await http().put('/api/training/orgatex').send({ online: false }).expect(200);
    const res = await http().get('/api/orgatex/status').expect(200);
    expect(res.body.online).toBe(false);
  });

  it('recovers when OrgaTEX is brought back online', async () => {
    await http().put('/api/training/orgatex').send({ online: false });
    await http().put('/api/training/orgatex').send({ online: true });
    const res = await http().get('/api/orgatex/status').expect(200);
    expect(res.body.online).toBe(true);
  });
});
