import type { INestApplication } from '@nestjs/common';
import { DomainError } from '../../../../src/server/common/errors/domain-error';
import { DummyOrgatexService } from '../../../../src/server/integrations/orgatex/dummy/dummy-orgatex.service';
import {
  ORGATEX_PORT,
  type OrgatexPort,
} from '../../../../src/server/integrations/orgatex/orgatex.port';
import { consumptionFor24187 } from '../../../helpers/consumption-fixture';
import { createTestApp } from '../../../helpers/create-test-app';

describe('OrgatexPort (Dummy adapter)', () => {
  let app: INestApplication;
  let port: OrgatexPort;
  let dummy: DummyOrgatexService;

  beforeAll(async () => {
    app = await createTestApp();
    port = app.get<OrgatexPort>(ORGATEX_PORT);
    dummy = app.get(DummyOrgatexService);
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => {
    dummy.setOnline(true);
  });

  it('is bound through dependency injection', () => {
    expect(port.constructor.name).toBe('DummyOrgatexAdapter');
  });

  it('returns the same data as the Dummy endpoints', async () => {
    await expect(port.listBatches()).resolves.toHaveLength(4);
    await expect(port.getBatch('B-24187')).resolves.toMatchObject({ status: 'RELEASED' });
    const recipe = await port.getRecipe('B-24187');
    expect(recipe.components.map((c) => c.sequence)).toEqual([1, 2, 3, 4, 5]);
  });

  it('tracks the last successful contact', async () => {
    const before = new Date();
    await port.listBatches();
    expect(port.lastSuccessfulContactAt()?.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('rejects with ORGATEX_UNAVAILABLE (503) when OrgaTEX is offline', async () => {
    const lastContact = port.lastSuccessfulContactAt();
    dummy.setOnline(false);
    await expect(port.listBatches()).rejects.toMatchObject({
      code: 'ORGATEX_UNAVAILABLE',
      httpStatus: 503,
    });
    await expect(port.getRecipe('B-24187')).rejects.toBeInstanceOf(DomainError);
    expect(port.lastSuccessfulContactAt()).toBe(lastContact);
  });

  it('rejects with BATCH_NOT_FOUND for an unknown batch', async () => {
    await expect(port.getBatch('B-00000')).rejects.toMatchObject({
      code: 'BATCH_NOT_FOUND',
      httpStatus: 404,
    });
  });

  it('posts consumption and returns the receipt', async () => {
    const receipt = await port.postConsumption('B-24187', 'adapter-key', consumptionFor24187());
    expect(receipt).toMatchObject({
      batchId: 'B-24187',
      idempotencyKey: 'adapter-key',
      lineCount: 5,
    });
  });

  it('rejects posting with ORGATEX_UNAVAILABLE when offline', async () => {
    dummy.setOnline(false);
    await expect(
      port.postConsumption('B-24190', 'k-offline', consumptionFor24187()),
    ).rejects.toMatchObject({ code: 'ORGATEX_UNAVAILABLE', httpStatus: 503 });
  });
});
