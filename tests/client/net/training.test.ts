import * as training from '../../../src/client/net/training';

describe('client/net/training', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function lastCall(): [string, RequestInit] {
    return fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];
  }

  it('setScaleWeight POSTs netMg to the scale weight endpoint', async () => {
    await training.setScaleWeight('scale-3kg', 94_000);
    const [url, init] = lastCall();
    expect(url).toBe('/api/training/scales/scale-3kg/weight');
    expect(init.body).toBe(JSON.stringify({ netMg: 94_000 }));
  });

  it('setScaleFault POSTs the fault', async () => {
    await training.setScaleFault('scale-3kg', 'NO_READING');
    const [url, init] = lastCall();
    expect(url).toBe('/api/training/scales/scale-3kg/weight');
    expect(init.body).toBe(JSON.stringify({ fault: 'NO_READING' }));
  });

  it('rampScale POSTs toMg (and durationMs when given) to the ramp endpoint', async () => {
    await training.rampScale('scale-3kg', 94_200);
    expect(lastCall()[0]).toBe('/api/training/scales/scale-3kg/ramp');
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({
      toMg: 94_200,
      durationMs: undefined,
    });

    await training.rampScale('scale-32kg', 24_000_000, 3_000);
    expect(JSON.parse(lastCall()[1].body as string)).toEqual({
      toMg: 24_000_000,
      durationMs: 3_000,
    });
  });

  it('setScaleOnline PUTs {online} to the scale', async () => {
    await training.setScaleOnline('scale-32kg', false);
    const [url, init] = lastCall();
    expect(url).toBe('/api/training/scales/scale-32kg');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ online: false }));
  });

  it('setScannerOnline PUTs {online} to the scanner', async () => {
    await training.setScannerOnline(true);
    const [url, init] = lastCall();
    expect(url).toBe('/api/training/scanner');
    expect(init.body).toBe(JSON.stringify({ online: true }));
  });

  it('injectScan POSTs the code', async () => {
    await training.injectScan('B-24187');
    const [url, init] = lastCall();
    expect(url).toBe('/api/training/scanner/scans');
    expect(init.body).toBe(JSON.stringify({ code: 'B-24187' }));
  });

  it('setOrgatexOnline PUTs {online} to orgatex', async () => {
    await training.setOrgatexOnline(false);
    const [url, init] = lastCall();
    expect(url).toBe('/api/training/orgatex');
    expect(init.body).toBe(JSON.stringify({ online: false }));
  });

  it('resetScenario POSTs the reset endpoint', async () => {
    await training.resetScenario();
    const [url, init] = lastCall();
    expect(url).toBe('/api/training/reset');
    expect(init.method).toBe('POST');
  });
});
