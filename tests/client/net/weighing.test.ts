import {
  activateComponent,
  authoriseOverride,
  complete,
  confirm,
  getSummary,
  quit,
  retare,
  startOrResumeSession,
  verifyIdentity,
} from '../../../src/client/net/weighing';

describe('client/net/weighing', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('startOrResumeSession POSTs /api/sessions with the batch id', async () => {
    await startOrResumeSession('B-24187');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ batchId: 'B-24187' }));
  });

  it('activateComponent POSTs the activate path', async () => {
    await activateComponent('s-1', 'RC-24187-03');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/components/RC-24187-03/activate');
    expect(init.method).toBe('POST');
  });

  it('retare POSTs the retare path', async () => {
    await retare('s-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/retare');
    expect(init.method).toBe('POST');
  });

  it('confirm POSTs the confirm path with no body', async () => {
    await confirm('s-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/confirm');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });

  it('verifyIdentity POSTs the scanned code', async () => {
    await verifyIdentity('s-1', 'DYE-1180');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/identity');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ code: 'DYE-1180' }));
  });

  it('authoriseOverride POSTs the pin and reason', async () => {
    await authoriseOverride('s-1', '4825', 'Lab approved');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/override');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ pin: '4825', reason: 'Lab approved' }));
  });

  it('quit POSTs the quit path', async () => {
    await quit('s-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/quit');
    expect(init.method).toBe('POST');
  });

  it('complete POSTs the complete path', async () => {
    await complete('s-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/complete');
    expect(init.method).toBe('POST');
  });

  it('getSummary GETs the summary path', async () => {
    await getSummary('s-1');
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/summary');
  });
});
