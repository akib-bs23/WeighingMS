import {
  getTicket,
  reprintTicket,
  retryTicket,
  submitTicket,
} from '../../../src/client/net/ticket';

describe('client/net/ticket', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getTicket GETs the ticket path', async () => {
    await getTicket('s-1');
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/ticket');
  });

  it('submitTicket POSTs the ticket path with no body', async () => {
    await submitTicket('s-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/ticket');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });

  it('retryTicket POSTs the retry path', async () => {
    await retryTicket('s-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/ticket/retry');
    expect(init.method).toBe('POST');
  });

  it('reprintTicket POSTs the reprint path', async () => {
    await reprintTicket('s-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/ticket/reprint');
    expect(init.method).toBe('POST');
  });
});
