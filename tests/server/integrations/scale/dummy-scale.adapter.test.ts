import type { INestApplication } from '@nestjs/common';
import { DummyScaleService } from '../../../../src/server/integrations/scale/dummy/dummy-scale.service';
import { SCALE_PORT, type ScalePort } from '../../../../src/server/integrations/scale/scale.port';
import { ResetRegistry } from '../../../../src/server/training/reset.registry';
import { createTestApp } from '../../../helpers/create-test-app';

describe('ScalePort (Dummy adapter)', () => {
  let app: INestApplication;
  let port: ScalePort;
  let dummy: DummyScaleService;

  beforeAll(async () => {
    app = await createTestApp();
    port = app.get<ScalePort>(SCALE_PORT);
    dummy = app.get(DummyScaleService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    app.get(ResetRegistry).resetAll();
  });

  it('is bound through dependency injection', () => {
    expect(port.constructor.name).toBe('DummyScaleAdapter');
  });

  it('lists scales and reports status', async () => {
    const list = await port.listScales();
    expect(list.map((s) => s.scaleId)).toEqual(['scale-3kg', 'scale-32kg']);
    await expect(port.getStatus('scale-32kg')).resolves.toMatchObject({ state: 'READY' });
  });

  it('reads weight and tares', async () => {
    dummy.setWeight('scale-3kg', 214_000);
    await expect(port.readWeight('scale-3kg')).resolves.toMatchObject({ netMg: 214_000 });
    await expect(port.tare('scale-3kg')).resolves.toEqual({
      scaleId: 'scale-3kg',
      tareMg: 214_000,
      netMg: 0,
    });
  });

  it('rejects with SCALE_UNAVAILABLE (503) when offline', async () => {
    dummy.setOnline('scale-3kg', false);
    await expect(port.readWeight('scale-3kg')).rejects.toMatchObject({
      code: 'SCALE_UNAVAILABLE',
      httpStatus: 503,
    });
    await expect(port.tare('scale-3kg')).rejects.toMatchObject({ code: 'SCALE_UNAVAILABLE' });
  });

  it('rejects with SCALE_NOT_FOUND (404) for an unknown scale', async () => {
    await expect(port.getStatus('nope')).rejects.toMatchObject({
      code: 'SCALE_NOT_FOUND',
      httpStatus: 404,
    });
  });
});
