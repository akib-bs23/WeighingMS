import {
  getOrgatexStatus,
  getPrinterStatus,
  getScaleStatus,
  getScannerStatus,
} from '../../../src/client/net/devices';

describe('client/net/devices', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getScaleStatus GETs the scale status path', async () => {
    await getScaleStatus('scale-3kg');
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/scales/scale-3kg/status');
  });

  it('getScannerStatus GETs the scanner status path', async () => {
    await getScannerStatus();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/scanner/status');
  });

  it('getPrinterStatus GETs the printer status path', async () => {
    await getPrinterStatus();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/printer/status');
  });

  it('getOrgatexStatus GETs the orgatex status path (never the training path)', async () => {
    await getOrgatexStatus();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/orgatex/status');
  });
});
