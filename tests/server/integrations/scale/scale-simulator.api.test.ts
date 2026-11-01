import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../../helpers/create-test-app';

describe('Scale simulator API (training)', () => {
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
  });

  it('GET reports the scale state', async () => {
    const res = await http().get('/api/training/scales/scale-32kg').expect(200);
    expect(res.body).toMatchObject({ scaleId: 'scale-32kg', online: true, state: 'READY' });
  });

  it('PUT toggles availability and returns the new status', async () => {
    const res = await http()
      .put('/api/training/scales/scale-3kg')
      .send({ online: false })
      .expect(200);
    expect(res.body).toMatchObject({ online: false, state: 'OFFLINE' });
  });

  it('POST weight returns the resulting reading', async () => {
    const res = await http()
      .post('/api/training/scales/scale-3kg/weight')
      .send({ netMg: 94_000 })
      .expect(200);
    expect(res.body).toMatchObject({ netMg: 94_000, stable: true });
  });

  it('setting a weight cancels a running pour', async () => {
    await http()
      .post('/api/training/scales/scale-3kg/ramp')
      .send({ toMg: 94_000, durationMs: 60_000 })
      .expect(200);
    await http().post('/api/training/scales/scale-3kg/weight').send({ netMg: 10_000 }).expect(200);
    const res = await http().get('/api/scales/scale-3kg/weight').expect(200);
    expect(res.body).toMatchObject({ netMg: 10_000, stable: true });
  });

  it('POST ramp starts an unstable pour', async () => {
    const res = await http()
      .post('/api/training/scales/scale-3kg/ramp')
      .send({ toMg: 94_200, durationMs: 60_000 })
      .expect(200);
    expect(res.body).toMatchObject({ stable: false });
  });

  it('POST ramp with zero duration lands immediately and stable', async () => {
    const res = await http()
      .post('/api/training/scales/scale-3kg/ramp')
      .send({ toMg: 94_200, durationMs: 0 })
      .expect(200);
    expect(res.body).toMatchObject({ netMg: 94_200, stable: true });
  });

  it.each([
    [{}, 'neither netMg nor fault'],
    [{ netMg: 1, fault: 'NO_READING' }, 'both netMg and fault'],
  ])('POST weight rejects %j (%s) with 400', async (body) => {
    const res = await http().post('/api/training/scales/scale-3kg/weight').send(body).expect(400);
    expect(res.body.error).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Provide exactly one of netMg or fault',
    });
  });

  it.each([
    ['/weight', { netMg: 93.5 }],
    ['/weight', { fault: 'OVERLOAD' }],
    ['/ramp', {}],
    ['/ramp', { toMg: 1, durationMs: -1 }],
    ['/ramp', { toMg: 1, durationMs: 60_001 }],
    ['', { online: 'yes' }],
  ])('rejects invalid body for %s %j with 400 VALIDATION_FAILED', async (path, body) => {
    const req =
      path === ''
        ? http().put('/api/training/scales/scale-3kg')
        : http().post(`/api/training/scales/scale-3kg${path}`);
    const res = await req.send(body).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('returns 404 for an unknown scale', async () => {
    await http().post('/api/training/scales/nope/weight').send({ netMg: 1 }).expect(404);
    await http().post('/api/training/scales/nope/ramp').send({ toMg: 1 }).expect(404);
    await http().put('/api/training/scales/nope').send({ online: false }).expect(404);
  });
});
