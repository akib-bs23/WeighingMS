import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { WriteBackService } from '../../../../src/server/integrations/orgatex/write-back/write-back.service';
import { consumptionFor24187 } from '../../../helpers/consumption-fixture';
import { createTestApp } from '../../../helpers/create-test-app';

describe('Write-back API', () => {
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

  it('returns 404 WRITE_BACK_NOT_FOUND before a session has completed', async () => {
    const res = await http().get('/api/sessions/s-1/write-back').expect(404);
    expect(res.body.error.code).toBe('WRITE_BACK_NOT_FOUND');
    await http().post('/api/sessions/s-1/write-back/retry').expect(404);
  });

  it('shows PENDING then CONFIRMED after Retry once OrgaTEX is back', async () => {
    await http().put('/api/training/orgatex').send({ online: false }).expect(200);
    await app.get(WriteBackService).submit('s-1', 'B-24187', consumptionFor24187());

    const pending = await http().get('/api/sessions/s-1/write-back').expect(200);
    expect(pending.body).toMatchObject({ status: 'PENDING', lastError: 'ORGATEX_UNAVAILABLE' });

    await http().put('/api/training/orgatex').send({ online: true }).expect(200);
    const retried = await http().post('/api/sessions/s-1/write-back/retry').expect(200);
    expect(retried.body).toMatchObject({ status: 'CONFIRMED', attempts: 2, lastError: null });

    const records = await http().get('/api/training/orgatex/consumption').expect(200);
    expect(records.body).toHaveLength(1);
  });
});
