import { getScanEvents } from '../../../src/client/net/scanner';

describe('client/net/scanner', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ events: [], lastSeq: 0 }),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls GET /api/scanner/events with the since sequence', async () => {
    await getScanEvents(7);
    expect(fetchMock).toHaveBeenCalledWith('/api/scanner/events?since=7', expect.anything());
  });
});
