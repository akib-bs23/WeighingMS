import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DATABASE, type Db } from '../../../src/server/database/database.provider';
import { orgatexBatches } from '../../../src/server/database/schema';
import { createTestApp } from '../../helpers/create-test-app';

describe('Training reset', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('seeds the database on application start', async () => {
    const res = await http().get('/api/batches').expect(200);
    expect(res.body).toHaveLength(4);
  });

  it('restores seed data and OrgaTEX availability in under 2 s', async () => {
    const db = app.get<Db>(DATABASE);
    db.delete(orgatexBatches).run();
    await http().put('/api/training/orgatex').send({ online: false }).expect(200);

    const started = Date.now();
    const res = await http().post('/api/training/reset').expect(200);
    const elapsed = Date.now() - started;

    expect(res.body.reset).toEqual(expect.arrayContaining(['dummy-orgatex']));
    expect(elapsed).toBeLessThan(2_000);
    const batches = await http().get('/api/batches').expect(200);
    expect(batches.body).toHaveLength(4);
    const recipe = await http().get('/api/batches/B-24187/recipe').expect(200);
    expect(recipe.body.components).toHaveLength(5);
  });

  it('can be repeated (idempotent)', async () => {
    await http().post('/api/training/reset').expect(200);
    await http().post('/api/training/reset').expect(200);
    const res = await http().get('/api/batches').expect(200);
    expect(res.body).toHaveLength(4);
  });
});
