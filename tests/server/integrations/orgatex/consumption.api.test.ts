import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type {
  ConsumptionRequest,
  StoredConsumption,
} from '../../../../src/shared/contracts/orgatex';
import { consumptionFor24187 } from '../../../helpers/consumption-fixture';
import { createTestApp } from '../../../helpers/create-test-app';

describe('Dummy OrgaTEX consumption receiver', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const post = (body: unknown, key: string | null = 'K1', batchId = 'B-24187') => {
    const req = http().post(`/api/batches/${batchId}/consumption`);
    return (key === null ? req : req.set('Idempotency-Key', key)).send(body as object);
  };
  const stored = async (batchId?: string): Promise<StoredConsumption[]> => {
    const q = batchId ? `?batchId=${batchId}` : '';
    const res = await http().get(`/api/training/orgatex/consumption${q}`).expect(200);
    return res.body as StoredConsumption[];
  };
  const withLines = (edit: (lines: ConsumptionRequest['lines']) => void): ConsumptionRequest => {
    const body = consumptionFor24187();
    edit(body.lines);
    return body;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await http().post('/api/training/reset').expect(200);
  });

  it('accepts valid consumption with 200 and a receipt', async () => {
    const res = await post(consumptionFor24187()).expect(200);
    expect(res.body).toMatchObject({ batchId: 'B-24187', idempotencyKey: 'K1', lineCount: 5 });
    expect(res.body.consumptionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isNaN(Date.parse(res.body.confirmedAt))).toBe(false);
  });

  it('stores the record with every line (Step 26 stored data)', async () => {
    const receipt = (await post(consumptionFor24187()).expect(200)).body;
    const records = await stored('B-24187');
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ ...receipt, ...consumptionFor24187() });
  });

  it('returns the original receipt for a retry with the same key and payload', async () => {
    const first = (await post(consumptionFor24187()).expect(200)).body;
    const again = (await post(consumptionFor24187()).expect(200)).body;
    expect(again).toEqual(first);
    expect(await stored()).toHaveLength(1);
  });

  it('rejects the same key with a different payload (409 IDEMPOTENCY_CONFLICT)', async () => {
    await post(consumptionFor24187()).expect(200);
    const changed = withLines((l) => {
      if (l[2]) l[2].actualMg = 94_300;
    });
    const res = await post(changed).expect(409);
    expect(res.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect((await stored())[0]?.lines[2]?.actualMg).toBe(94_200);
  });

  it('refuses a second posting for the same batch with another key (409)', async () => {
    await post(consumptionFor24187(), 'K1').expect(200);
    const res = await post(consumptionFor24187(), 'K2').expect(409);
    expect(res.body.error.code).toBe('CONSUMPTION_ALREADY_POSTED');
    expect(await stored()).toHaveLength(1);
  });

  it.each([null, '', '   '])('requires the Idempotency-Key header (%j → 400)', async (key) => {
    const res = await post(consumptionFor24187(), key).expect(400);
    expect(res.body.error).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Idempotency-Key header is required',
    });
  });

  it.each<[string, (b: ConsumptionRequest) => void]>([
    ['no lines', (b) => (b.lines = [])],
    ['negative actual', (b) => b.lines[0] && (b.lines[0].actualMg = -1)],
    ['fractional mg', (b) => b.lines[0] && (b.lines[0].actualMg = 1.5)],
    ['zero target', (b) => b.lines[0] && (b.lines[0].targetMg = 0)],
    ['unknown result', (b) => b.lines[0] && Object.assign(b.lines[0], { result: 'OK' })],
    ['unknown unit', (b) => b.lines[0] && Object.assign(b.lines[0], { uom: 'lb' })],
    ['bad completedAt', (b) => (b.completedAt = 'yesterday')],
    ['missing stationId', (b) => Object.assign(b, { stationId: '' })],
  ])('rejects an invalid body (%s) with 400 VALIDATION_FAILED', async (_name, edit) => {
    const body = consumptionFor24187();
    edit(body);
    const res = await post(body).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(await stored()).toHaveLength(0);
  });

  it.each<[string, (l: ConsumptionRequest['lines']) => void, string]>([
    [
      'unknown component',
      (l) => l[0] && (l[0].componentId = 'RC-99999-01'),
      'RC-99999-01: not a component',
    ],
    [
      'duplicate component',
      (l) => l[1] && (l[1].componentId = 'RC-24187-01'),
      'reported more than once',
    ],
    ['missing component', (l) => l.pop(), 'RC-24187-05: missing'],
    [
      'wrong dyestuff',
      (l) => l[2] && (l[2].dyestuffCode = 'DYE-2204'),
      'dyestuff DYE-2204 != DYE-4471',
    ],
    ['wrong lot', (l) => l[2] && (l[2].lotId = '2026-0000'), 'lot 2026-0000 != 2026-0387'],
    ['wrong unit', (l) => l[3] && (l[3].uom = 'g'), 'unit g != kg'],
  ])('rejects a recipe mismatch (%s) with 422', async (_name, edit, problem) => {
    const res = await post(withLines(edit)).expect(422);
    expect(res.body.error.code).toBe('CONSUMPTION_MISMATCH');
    expect(res.body.error.details.problems).toEqual(
      expect.arrayContaining([expect.stringContaining(problem)]),
    );
    expect(await stored()).toHaveLength(0);
  });

  it('returns 404 BATCH_NOT_FOUND for an unknown batch', async () => {
    const res = await post(consumptionFor24187(), 'K1', 'B-00000').expect(404);
    expect(res.body.error.code).toBe('BATCH_NOT_FOUND');
  });

  it('returns 404 RECIPE_NOT_FOUND for a batch without an issued recipe', async () => {
    const res = await post(consumptionFor24187(), 'K1', 'B-24188').expect(404);
    expect(res.body.error.code).toBe('RECIPE_NOT_FOUND');
  });

  it('returns 503 ORGATEX_UNAVAILABLE when OrgaTEX is offline and stores nothing', async () => {
    await http().put('/api/training/orgatex').send({ online: false }).expect(200);
    const res = await post(consumptionFor24187()).expect(503);
    expect(res.body.error.code).toBe('ORGATEX_UNAVAILABLE');
    expect(await stored()).toHaveLength(0);
  });

  it('inspection lists all records or filters by batch', async () => {
    await post(consumptionFor24187()).expect(200);
    expect(await stored()).toHaveLength(1);
    expect(await stored('B-24187')).toHaveLength(1);
    expect(await stored('B-24190')).toHaveLength(0);
  });

  it('training reset clears stored consumption', async () => {
    await post(consumptionFor24187()).expect(200);
    await http().post('/api/training/reset').expect(200);
    expect(await stored()).toHaveLength(0);
    await post(consumptionFor24187(), 'K2').expect(200);
  });
});
