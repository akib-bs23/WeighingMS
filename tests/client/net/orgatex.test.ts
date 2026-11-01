import { getBatch, getRecipe, listBatches } from '../../../src/client/net/orgatex';

describe('client/net/orgatex', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('listBatches calls GET /api/batches', async () => {
    await listBatches();
    expect(fetchMock).toHaveBeenCalledWith('/api/batches', expect.anything());
  });

  it('getBatch calls GET /api/batches/:id, encoding the id', async () => {
    await getBatch('B-24187');
    expect(fetchMock).toHaveBeenCalledWith('/api/batches/B-24187', expect.anything());
  });

  it('getRecipe calls GET /api/batches/:id/recipe', async () => {
    await getRecipe('B-24187');
    expect(fetchMock).toHaveBeenCalledWith('/api/batches/B-24187/recipe', expect.anything());
  });
});
