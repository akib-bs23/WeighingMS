import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { OrgatexBatch, OrgatexRecipe } from '../../../../src/shared/contracts/orgatex';
import { createTestApp } from '../../../helpers/create-test-app';

describe('Dummy OrgaTEX API', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/batches', () => {
    it('returns the four seeded batches with prototype values', async () => {
      const res = await http().get('/api/batches').expect(200);
      expect(res.body).toEqual<OrgatexBatch[]>([
        {
          batchId: 'B-24187',
          orderRef: 'SO-9931',
          machineRef: 'JET-04',
          fabricDesc: '100% CTN knit',
          fabricWeightKg: 480,
          shadeCode: 'Teal 4C',
          componentCount: 5,
          status: 'RELEASED',
          recipeId: 'R-24187',
        },
        {
          batchId: 'B-24188',
          orderRef: 'SO-9931',
          machineRef: 'JET-07',
          fabricDesc: '100% CTN knit',
          fabricWeightKg: 520,
          shadeCode: 'Teal 4C',
          componentCount: 5,
          status: 'QUEUED',
          recipeId: 'R-24188',
        },
        {
          batchId: 'B-24190',
          orderRef: 'SO-9944',
          machineRef: 'JET-02',
          fabricDesc: 'CVC fleece',
          fabricWeightKg: 310,
          shadeCode: 'Navy 12',
          componentCount: 7,
          status: 'QUEUED',
          recipeId: 'R-24190',
        },
        {
          batchId: 'B-24191',
          orderRef: 'SO-9947',
          machineRef: 'WINCH-01',
          fabricDesc: 'Viscose jersey',
          fabricWeightKg: 190,
          shadeCode: 'Rose 08',
          componentCount: 4,
          status: 'QUEUED',
          recipeId: 'R-24191',
        },
      ]);
    });
  });

  describe('GET /api/batches/:batchId', () => {
    it('returns batch B-24187', async () => {
      const res = await http().get('/api/batches/B-24187').expect(200);
      expect(res.body).toMatchObject({
        batchId: 'B-24187',
        orderRef: 'SO-9931',
        machineRef: 'JET-04',
        shadeCode: 'Teal 4C',
        fabricDesc: '100% CTN knit',
        fabricWeightKg: 480,
        componentCount: 5,
      });
    });

    it('returns 404 BATCH_NOT_FOUND in the standard error format', async () => {
      const res = await http().get('/api/batches/B-00000').expect(404);
      expect(res.body).toEqual({
        error: {
          code: 'BATCH_NOT_FOUND',
          message: 'Batch B-00000 not found',
          details: { batchId: 'B-00000' },
        },
      });
    });

    it('treats batch ids as exact (case-sensitive)', async () => {
      await http().get('/api/batches/b-24187').expect(404);
    });
  });

  describe('GET /api/batches/:batchId/recipe', () => {
    it('returns the five components in sequence with prototype values in mg', async () => {
      const res = await http().get('/api/batches/B-24187/recipe').expect(200);
      const recipe = res.body as OrgatexRecipe;
      expect(recipe).toMatchObject({
        batchId: 'B-24187',
        recipeId: 'R-24187',
        shadeCode: 'Teal 4C',
      });
      expect(
        recipe.components.map((c) => ({
          seq: c.sequence,
          code: c.dyestuff.code,
          name: c.dyestuff.name,
          uom: c.uom,
          targetMg: c.targetMg,
          toleranceMg: c.toleranceMg,
          lotId: c.lotId,
          containerId: c.containerId,
        })),
      ).toEqual([
        {
          seq: 1,
          code: 'DYE-1180',
          name: 'Remazol Brill. Blue RSPL',
          uom: 'g',
          targetMg: 1_240_000,
          toleranceMg: 6_000,
          lotId: '2026-0341',
          containerId: 'C-09',
        },
        {
          seq: 2,
          code: 'DYE-2204',
          name: 'Remazol Red RB',
          uom: 'g',
          targetMg: 386_000,
          toleranceMg: 2_000,
          lotId: '2026-0298',
          containerId: 'C-11',
        },
        {
          seq: 3,
          code: 'DYE-4471',
          name: 'Remazol Yellow RGB',
          uom: 'g',
          targetMg: 94_000,
          toleranceMg: 500,
          lotId: '2026-0387',
          containerId: 'C-12',
        },
        {
          seq: 4,
          code: 'AUX-0101',
          name: 'Sodium Sulphate',
          uom: 'kg',
          targetMg: 24_000_000,
          toleranceMg: 120_000,
          lotId: '2026-0112',
          containerId: 'D-03',
        },
        {
          seq: 5,
          code: 'AUX-0107',
          name: 'Soda Ash',
          uom: 'kg',
          targetMg: 9_600_000,
          toleranceMg: 48_000,
          lotId: '2026-0155',
          containerId: 'D-05',
        },
      ]);
    });

    it('includes dyestuff colour and barcode for identification', async () => {
      const res = await http().get('/api/batches/B-24187/recipe').expect(200);
      const yellow = (res.body as OrgatexRecipe).components[2];
      expect(yellow?.dyestuff).toEqual({
        code: 'DYE-4471',
        name: 'Remazol Yellow RGB',
        type: 'DYE',
        colourHex: '#d9a520',
        barcode: 'DYE-4471',
      });
      expect(yellow?.displayMaxMg).toBe(125_000);
    });

    it('does not expose container tare (WeighingMS-owned)', async () => {
      const res = await http().get('/api/batches/B-24187/recipe').expect(200);
      expect(JSON.stringify(res.body)).not.toMatch(/tare/i);
    });

    it('returns 404 RECIPE_NOT_FOUND for a queued batch without an issued recipe', async () => {
      const res = await http().get('/api/batches/B-24188/recipe').expect(404);
      expect(res.body.error.code).toBe('RECIPE_NOT_FOUND');
    });

    it('returns 404 BATCH_NOT_FOUND for an unknown batch', async () => {
      const res = await http().get('/api/batches/B-99999/recipe').expect(404);
      expect(res.body.error.code).toBe('BATCH_NOT_FOUND');
    });

    it('offers no write method on the recipe (read-only)', async () => {
      const res = await http().put('/api/batches/B-24187/recipe').send({}).expect(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      await http().post('/api/batches/B-24187/recipe').send({}).expect(404);
      await http().delete('/api/batches/B-24187/recipe').expect(404);
    });
  });
});
