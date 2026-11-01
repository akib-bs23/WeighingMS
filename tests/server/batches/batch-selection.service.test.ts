import type { INestApplication } from '@nestjs/common';
import { BatchSelectionService } from '../../../src/server/batches/batch-selection.service';
import { DummyOrgatexService } from '../../../src/server/integrations/orgatex/dummy/dummy-orgatex.service';
import {
  ORGATEX_PORT,
  type OrgatexPort,
} from '../../../src/server/integrations/orgatex/orgatex.port';
import { ResetRegistry } from '../../../src/server/training/reset.registry';
import { createTestApp } from '../../helpers/create-test-app';

describe('BatchSelectionService', () => {
  let app: INestApplication;
  let selection: BatchSelectionService;
  let port: OrgatexPort;

  beforeAll(async () => {
    app = await createTestApp();
    selection = app.get(BatchSelectionService);
    port = app.get<OrgatexPort>(ORGATEX_PORT);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    vi.restoreAllMocks();
    app.get(ResetRegistry).resetAll();
  });

  it('returns the released batch and its five-component recipe', async () => {
    const { batch, recipe } = await selection.prepareForWeighing('B-24187');
    expect(batch).toMatchObject({ batchId: 'B-24187', status: 'RELEASED', orderRef: 'SO-9931' });
    expect(recipe.components.map((c) => c.dyestuff.name)).toEqual([
      'Remazol Brill. Blue RSPL',
      'Remazol Red RB',
      'Remazol Yellow RGB',
      'Sodium Sulphate',
      'Soda Ash',
    ]);
  });

  it('reads the batch before the recipe, through OrgatexPort', async () => {
    const calls: string[] = [];
    vi.spyOn(port, 'getBatch').mockImplementation((id) => {
      calls.push(`batch:${id}`);
      return Promise.resolve(app.get(DummyOrgatexService).getBatch(id));
    });
    vi.spyOn(port, 'getRecipe').mockImplementation((id) => {
      calls.push(`recipe:${id}`);
      return Promise.resolve(app.get(DummyOrgatexService).getRecipe(id));
    });
    await selection.prepareForWeighing('B-24187');
    expect(calls).toEqual(['batch:B-24187', 'recipe:B-24187']);
  });

  it('refuses a queued batch without requesting its recipe', async () => {
    const recipeSpy = vi.spyOn(port, 'getRecipe');
    await expect(selection.prepareForWeighing('B-24188')).rejects.toMatchObject({
      code: 'BATCH_NOT_RELEASED',
      httpStatus: 409,
      message: 'Batch B-24188 not released by OrgaTEX (status QUEUED)',
      details: { batchId: 'B-24188', status: 'QUEUED' },
    });
    expect(recipeSpy).not.toHaveBeenCalled();
  });

  it('accepts a scanned batch card with surrounding whitespace', async () => {
    const { batch } = await selection.select('  B-24187 ');
    expect(batch.batchId).toBe('B-24187');
  });

  it('rejects a dyestuff barcode as NOT_A_BATCH_CODE (422)', async () => {
    await expect(selection.select('DYE-4471')).rejects.toMatchObject({
      code: 'NOT_A_BATCH_CODE',
      httpStatus: 422,
    });
  });

  it('rejects an empty code (400)', async () => {
    await expect(selection.select('   ')).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
      httpStatus: 400,
    });
  });

  it('propagates BATCH_NOT_FOUND (404)', async () => {
    await expect(selection.select('B-99999')).rejects.toMatchObject({
      code: 'BATCH_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('propagates ORGATEX_UNAVAILABLE (503) without inventing data', async () => {
    app.get(DummyOrgatexService).setOnline(false);
    await expect(selection.prepareForWeighing('B-24187')).rejects.toMatchObject({
      code: 'ORGATEX_UNAVAILABLE',
      httpStatus: 503,
    });
  });
});
