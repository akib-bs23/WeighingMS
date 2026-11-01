import { getStation } from '../../../src/client/net/station';

describe('client/net/station', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls GET /api/station', async () => {
    await getStation();
    expect(fetchMock).toHaveBeenCalledWith('/api/station', expect.anything());
  });
});
