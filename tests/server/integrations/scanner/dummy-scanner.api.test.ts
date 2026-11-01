import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { ScanFeed } from '../../../../src/shared/contracts/devices';
import { createTestApp } from '../../../helpers/create-test-app';

describe('Dummy Scanner API', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());
  const scan = (code: string) => http().post('/api/training/scanner/scans').send({ code });
  const setOnline = (online: boolean) =>
    http().put('/api/training/scanner').send({ online }).expect(200);

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await http().post('/api/training/reset').expect(200);
  });

  it('reports online status', async () => {
    await http().get('/api/scanner/status').expect(200, { online: true });
  });

  it('delivers an injected batch-card scan through the feed', async () => {
    const injected = await scan('B-24187').expect(201);
    expect(injected.body).toMatchObject({ seq: 1, code: 'B-24187' });
    const feed = await http().get('/api/scanner/events?since=0').expect(200);
    expect(feed.body).toEqual({
      events: [{ seq: 1, code: 'B-24187', scannedAt: injected.body.scannedAt }],
      lastSeq: 1,
    });
  });

  it('trims surrounding whitespace from codes', async () => {
    const res = await scan('  DYE-4471 \n').expect(201);
    expect(res.body.code).toBe('DYE-4471');
  });

  it('numbers events and filters with since', async () => {
    await scan('B-24187').expect(201);
    await scan('DYE-1180').expect(201);
    await scan('DYE-2204').expect(201);
    const all = await http().get('/api/scanner/events').expect(200);
    expect((all.body as ScanFeed).events.map((e) => e.seq)).toEqual([1, 2, 3]);
    const newer = await http().get('/api/scanner/events?since=2').expect(200);
    expect(newer.body).toMatchObject({ events: [{ seq: 3, code: 'DYE-2204' }], lastSeq: 3 });
    const none = await http().get('/api/scanner/events?since=3').expect(200);
    expect(none.body).toEqual({ events: [], lastSeq: 3 });
  });

  it.each(['', '   '])('rejects blank code %j with 400 INVALID_SCAN', async (code) => {
    const res = await scan(code).expect(400);
    expect(res.body.error.code).toBe('INVALID_SCAN');
  });

  it('rejects a missing code with 400 VALIDATION_FAILED', async () => {
    const res = await http().post('/api/training/scanner/scans').send({}).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it.each(['-1', 'abc', '1.5'])('rejects since=%s with 400', async (since) => {
    await http().get(`/api/scanner/events?since=${since}`).expect(400);
  });

  it('returns 503 SCANNER_UNAVAILABLE for inject and feed when offline', async () => {
    await setOnline(false);
    const injected = await scan('B-24187').expect(503);
    expect(injected.body.error).toEqual({
      code: 'SCANNER_UNAVAILABLE',
      message: 'Scanner is not responding',
    });
    await http().get('/api/scanner/events').expect(503);
    await http().get('/api/scanner/status').expect(200, { online: false });
  });

  it('works again when back online', async () => {
    await setOnline(false);
    await setOnline(true);
    await scan('B-24187').expect(201);
  });

  it('reset clears events and sequence numbers', async () => {
    await scan('B-24187').expect(201);
    const res = await http().post('/api/training/reset').expect(200);
    expect(res.body.reset).toEqual(expect.arrayContaining(['dummy-scanner']));
    await http().get('/api/scanner/events').expect(200, { events: [], lastSeq: 0 });
    const next = await scan('B-24187').expect(201);
    expect(next.body.seq).toBe(1);
  });
});
