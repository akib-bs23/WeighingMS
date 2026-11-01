import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { ScaleInfo } from '../../../../src/shared/contracts/devices';
import { createTestApp } from '../../../helpers/create-test-app';

describe('Dummy Scale API', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const setNet = (scaleId: string, netMg: number) =>
    http().post(`/api/training/scales/${scaleId}/weight`).send({ netMg }).expect(200);
  const setOnline = (scaleId: string, online: boolean) =>
    http().put(`/api/training/scales/${scaleId}`).send({ online }).expect(200);

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await http().post('/api/training/reset').expect(200);
  });

  describe('GET /api/scales', () => {
    it('lists the precision and floor scales from the seed', async () => {
      const res = await http().get('/api/scales').expect(200);
      expect(res.body).toEqual([
        {
          scaleId: 'scale-3kg',
          class: 'PRECISION',
          name: '3 kg precision',
          uom: 'g',
          capacityMg: 3_000_000,
          resolutionMg: 100,
          online: true,
        },
        {
          scaleId: 'scale-32kg',
          class: 'FLOOR',
          name: '32 kg floor',
          uom: 'kg',
          capacityMg: 32_000_000,
          resolutionMg: 1_000,
          online: true,
        },
      ]);
    });

    it('reflects an offline scale', async () => {
      await setOnline('scale-32kg', false);
      const res = await http().get('/api/scales').expect(200);
      expect((res.body as ScaleInfo[]).map((s) => s.online)).toEqual([true, false]);
    });
  });

  describe('GET /api/scales/:scaleId/status', () => {
    it('reports READY with capacity and resolution', async () => {
      await http().get('/api/scales/scale-3kg/status').expect(200, {
        scaleId: 'scale-3kg',
        online: true,
        state: 'READY',
        capacityMg: 3_000_000,
        resolutionMg: 100,
      });
    });

    it('returns 404 SCALE_NOT_FOUND for an unknown scale', async () => {
      const res = await http().get('/api/scales/scale-99kg/status').expect(404);
      expect(res.body.error).toEqual({
        code: 'SCALE_NOT_FOUND',
        message: 'Scale scale-99kg not found',
        details: { scaleId: 'scale-99kg' },
      });
    });
  });

  describe('GET /api/scales/:scaleId/weight', () => {
    it('starts at a stable zero', async () => {
      const res = await http().get('/api/scales/scale-3kg/weight').expect(200);
      expect(res.body).toMatchObject({
        scaleId: 'scale-3kg',
        netMg: 0,
        stable: true,
        overload: false,
        error: null,
      });
      expect(Number.isNaN(Date.parse(res.body.readAt))).toBe(false);
    });

    it('returns a simulator-set weight (93.5 g)', async () => {
      await setNet('scale-3kg', 93_500);
      const res = await http().get('/api/scales/scale-3kg/weight').expect(200);
      expect(res.body).toMatchObject({ netMg: 93_500, stable: true });
    });

    it.each([
      ['scale-3kg', 94_230, 94_200],
      ['scale-3kg', 94_250, 94_300],
      ['scale-32kg', 24_000_400, 24_000_000],
      ['scale-32kg', 9_621_600, 9_622_000],
    ])('rounds %s reading %i mg to resolution → %i mg', async (scaleId, set, expected) => {
      await setNet(scaleId, set);
      const res = await http().get(`/api/scales/${scaleId}/weight`).expect(200);
      expect(res.body.netMg).toBe(expected);
    });

    it('reports negative readings as-is for WeighingMS to reject', async () => {
      await setNet('scale-3kg', -5_000);
      const res = await http().get('/api/scales/scale-3kg/weight').expect(200);
      expect(res.body).toMatchObject({ netMg: -5_000, overload: false, error: null });
    });

    it('flags overload above capacity (3 500 g on the 3 kg scale)', async () => {
      await setNet('scale-3kg', 3_500_000);
      const res = await http().get('/api/scales/scale-3kg/weight').expect(200);
      expect(res.body).toMatchObject({ netMg: 3_500_000, overload: true });
    });

    it('reports a NO_READING fault with a null value', async () => {
      await http()
        .post('/api/training/scales/scale-3kg/weight')
        .send({ fault: 'NO_READING' })
        .expect(200);
      const res = await http().get('/api/scales/scale-3kg/weight').expect(200);
      expect(res.body).toMatchObject({ netMg: null, stable: false, error: 'NO_READING' });
    });

    it('returns 404 for an unknown scale', async () => {
      await http().get('/api/scales/nope/weight').expect(404);
    });
  });

  describe('POST /api/scales/:scaleId/tare', () => {
    it('zeroes the net reading with the load on the scale', async () => {
      await setNet('scale-3kg', 264_000);
      await http()
        .post('/api/scales/scale-3kg/tare')
        .expect(200, { scaleId: 'scale-3kg', tareMg: 264_000, netMg: 0 });
      const res = await http().get('/api/scales/scale-3kg/weight').expect(200);
      expect(res.body.netMg).toBe(0);
    });

    it('makes later weights relative to the new tare', async () => {
      await setNet('scale-3kg', 214_000);
      await http().post('/api/scales/scale-3kg/tare').expect(200);
      await setNet('scale-3kg', 94_000);
      const res = await http().get('/api/scales/scale-3kg/weight').expect(200);
      expect(res.body.netMg).toBe(94_000);
    });

    it('accumulates when tared twice', async () => {
      await setNet('scale-32kg', 1_850_000);
      await http().post('/api/scales/scale-32kg/tare').expect(200);
      await setNet('scale-32kg', 500_000);
      const res = await http().post('/api/scales/scale-32kg/tare').expect(200);
      expect(res.body.tareMg).toBe(2_350_000);
    });

    it('tares a faulted scale without moving the tare', async () => {
      await http()
        .post('/api/training/scales/scale-3kg/weight')
        .send({ fault: 'NO_READING' })
        .expect(200);
      const res = await http().post('/api/scales/scale-3kg/tare').expect(200);
      expect(res.body).toEqual({ scaleId: 'scale-3kg', tareMg: 0, netMg: 0 });
    });
  });

  describe('offline scale', () => {
    it('returns 503 SCALE_UNAVAILABLE for weight and tare, and OFFLINE status', async () => {
      await setOnline('scale-3kg', false);
      const weight = await http().get('/api/scales/scale-3kg/weight').expect(503);
      expect(weight.body.error).toEqual({
        code: 'SCALE_UNAVAILABLE',
        message: 'Scale scale-3kg is not responding',
        details: { scaleId: 'scale-3kg' },
      });
      await http().post('/api/scales/scale-3kg/tare').expect(503);
      const status = await http().get('/api/scales/scale-3kg/status').expect(200);
      expect(status.body).toMatchObject({ online: false, state: 'OFFLINE' });
    });

    it('does not affect the other scale', async () => {
      await setOnline('scale-3kg', false);
      await http().get('/api/scales/scale-32kg/weight').expect(200);
    });

    it('resumes from the last state when back online', async () => {
      await setNet('scale-3kg', 50_000);
      await setOnline('scale-3kg', false);
      await http().get('/api/scales/scale-3kg/weight').expect(503);
      await setOnline('scale-3kg', true);
      const res = await http().get('/api/scales/scale-3kg/weight').expect(200);
      expect(res.body.netMg).toBe(50_000);
    });
  });

  describe('training reset', () => {
    it('registers scales and restores zero, online state', async () => {
      await setNet('scale-3kg', 50_000);
      await setOnline('scale-32kg', false);
      const res = await http().post('/api/training/reset').expect(200);
      expect(res.body.reset).toEqual(expect.arrayContaining(['dummy-scales']));
      const weight = await http().get('/api/scales/scale-3kg/weight').expect(200);
      expect(weight.body.netMg).toBe(0);
      await http().get('/api/scales/scale-32kg/weight').expect(200);
    });
  });

  it('serves weight reads fast enough for 10 Hz polling (< 20 ms)', async () => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await http().get('/api/scales/scale-3kg/weight').expect(200);
      times.push(performance.now() - start);
    }
    expect(Math.max(...times)).toBeLessThan(20);
  });
});
