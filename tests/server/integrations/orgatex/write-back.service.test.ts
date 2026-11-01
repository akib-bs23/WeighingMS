import type { INestApplication } from '@nestjs/common';
import { DummyOrgatexService } from '../../../../src/server/integrations/orgatex/dummy/dummy-orgatex.service';
import {
  ORGATEX_PORT,
  type OrgatexPort,
} from '../../../../src/server/integrations/orgatex/orgatex.port';
import { WriteBackService } from '../../../../src/server/integrations/orgatex/write-back/write-back.service';
import { ResetRegistry } from '../../../../src/server/training/reset.registry';
import { consumptionFor24187 } from '../../../helpers/consumption-fixture';
import { createTestApp } from '../../../helpers/create-test-app';

describe('WriteBackService', () => {
  let app: INestApplication;
  let writeBack: WriteBackService;
  let dummy: DummyOrgatexService;
  const SESSION = 'session-1';
  const submit = () => writeBack.submit(SESSION, 'B-24187', consumptionFor24187());

  beforeAll(async () => {
    app = await createTestApp();
    writeBack = app.get(WriteBackService);
    dummy = app.get(DummyOrgatexService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    vi.restoreAllMocks();
    app.get(ResetRegistry).resetAll();
  });

  it('confirms immediately when OrgaTEX is online', async () => {
    const state = await submit();
    const [record] = dummy.listConsumption('B-24187');
    expect(state).toEqual({
      sessionId: SESSION,
      batchId: 'B-24187',
      status: 'CONFIRMED',
      consumptionId: record?.consumptionId,
      confirmedAt: record?.confirmedAt,
      attempts: 1,
      lastError: null,
    });
    expect(record?.idempotencyKey).toBe(SESSION);
  });

  it('keeps the batch completed locally as PENDING when OrgaTEX is unavailable', async () => {
    dummy.setOnline(false);
    const state = await submit();
    expect(state).toMatchObject({
      status: 'PENDING',
      attempts: 1,
      lastError: 'ORGATEX_UNAVAILABLE',
      consumptionId: null,
      confirmedAt: null,
    });
    expect(dummy.listConsumption()).toHaveLength(0);
  });

  it('stays PENDING while OrgaTEX is still down, counting attempts', async () => {
    dummy.setOnline(false);
    await submit();
    const state = await writeBack.retry(SESSION);
    expect(state).toMatchObject({ status: 'PENDING', attempts: 2 });
  });

  it('retry after OrgaTEX returns confirms with exactly one stored record', async () => {
    dummy.setOnline(false);
    await submit();
    dummy.setOnline(true);
    const state = await writeBack.retry(SESSION);
    expect(state).toMatchObject({ status: 'CONFIRMED', attempts: 2, lastError: null });
    expect(dummy.listConsumption()).toHaveLength(1);
  });

  it('retry when already CONFIRMED does not contact OrgaTEX again', async () => {
    await submit();
    const port = app.get<OrgatexPort>(ORGATEX_PORT);
    const spy = vi.spyOn(port, 'postConsumption');
    const state = await writeBack.retry(SESSION);
    expect(spy).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: 'CONFIRMED', attempts: 1 });
    expect(dummy.listConsumption()).toHaveLength(1);
  });

  it('submitting the same session twice is safe', async () => {
    await submit();
    const state = await submit();
    expect(state.status).toBe('CONFIRMED');
    expect(dummy.listConsumption()).toHaveLength(1);
  });

  it('never double-posts after an ambiguous failure (IR-08)', async () => {
    // OrgaTEX stored the posting but the response was lost: the station only saw a failure.
    const port = app.get<OrgatexPort>(ORGATEX_PORT);
    const real = port.postConsumption.bind(port);
    vi.spyOn(port, 'postConsumption').mockImplementationOnce(async (...args) => {
      await real(...args);
      throw new Error('socket hang up');
    });
    const first = await submit();
    expect(first).toMatchObject({ status: 'PENDING', lastError: 'INTERNAL_ERROR' });
    const retried = await writeBack.retry(SESSION);
    expect(retried.status).toBe('CONFIRMED');
    expect(dummy.listConsumption()).toHaveLength(1);
    expect(retried.consumptionId).toBe(dummy.listConsumption()[0]?.consumptionId);
  });

  it('keeps a rejected posting PENDING with the rejection code', async () => {
    const bad = consumptionFor24187();
    bad.lines.pop();
    const state = await writeBack.submit(SESSION, 'B-24187', bad);
    expect(state).toMatchObject({ status: 'PENDING', lastError: 'CONSUMPTION_MISMATCH' });
  });

  it('throws WRITE_BACK_NOT_FOUND for an unknown session', async () => {
    expect(() => writeBack.get('nope')).toThrow(
      expect.objectContaining({ code: 'WRITE_BACK_NOT_FOUND', httpStatus: 404 }) as Error,
    );
    await expect(writeBack.retry('nope')).rejects.toMatchObject({ code: 'WRITE_BACK_NOT_FOUND' });
  });

  it('training reset clears write-backs', async () => {
    await submit();
    app.get(ResetRegistry).resetAll();
    expect(() => writeBack.get(SESSION)).toThrow();
  });
});
