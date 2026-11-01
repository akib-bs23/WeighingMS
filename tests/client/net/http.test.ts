import { ApiError, request } from '../../../src/client/net/http';

describe('request (client API)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls /api + path and returns the parsed JSON', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ hello: 'world' }) });
    const result = await request<{ hello: string }>('/batches');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/batches',
      expect.objectContaining({ headers: expect.anything() }),
    );
    expect(result).toEqual({ hello: 'world' });
  });

  it('sets content-type: application/json when a body is sent (so NestJS parses it)', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await request('/sessions', { method: 'POST', body: JSON.stringify({ batchId: 'B-24187' }) });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('does not override an explicitly set content-type', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await request('/x', { method: 'POST', body: 'raw', headers: { 'content-type': 'text/plain' } });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('content-type')).toBe('text/plain');
  });

  it('does not set content-type for a bodyless GET', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
    await request('/batches');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.has('content-type')).toBe(false);
  });

  it('throws ApiError with the body code/message on a non-ok response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          error: { code: 'BATCH_NOT_RELEASED', message: 'Batch B-24188 not released' },
        }),
    });
    await expect(request('/batches/B-24188')).rejects.toMatchObject({
      status: 409,
      code: 'BATCH_NOT_RELEASED',
      message: 'Batch B-24188 not released',
    });
  });

  it('falls back to HTTP status when the error body is not the standard shape', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    });
    await expect(request('/batches')).rejects.toMatchObject({ status: 500, code: 'HTTP_500' });
  });

  it('wraps a network failure as NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(request('/batches')).rejects.toBeInstanceOf(ApiError);
    await expect(request('/batches')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
