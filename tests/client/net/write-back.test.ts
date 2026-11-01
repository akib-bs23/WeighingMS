import { getWriteBack, retryWriteBack } from '../../../src/client/net/write-back';

describe('client/net/write-back', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getWriteBack GETs the write-back path', async () => {
    await getWriteBack('s-1');
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/write-back');
  });

  it('retryWriteBack POSTs the retry path', async () => {
    await retryWriteBack('s-1');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/sessions/s-1/write-back/retry');
    expect(init.method).toBe('POST');
  });
});
