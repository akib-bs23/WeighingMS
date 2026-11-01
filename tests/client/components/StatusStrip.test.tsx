// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import * as devices from '../../../src/client/net/devices';
import { StatusStrip } from '../../../src/client/components/StatusStrip';

vi.mock('../../../src/client/net/devices');

function scaleStatus(online: boolean): ReturnType<typeof devices.getScaleStatus> {
  return Promise.resolve({
    scaleId: 'scale-3kg',
    online,
    state: online ? 'READY' : 'OFFLINE',
    capacityMg: 3_000_000,
    resolutionMg: 100,
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('StatusStrip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(devices.getScaleStatus).mockImplementation((scaleId) =>
      scaleStatus(scaleId !== 'offline-scale'),
    );
    vi.mocked(devices.getScannerStatus).mockResolvedValue({ online: true });
    vi.mocked(devices.getPrinterStatus).mockResolvedValue({ online: true });
    vi.mocked(devices.getOrgatexStatus).mockResolvedValue({
      online: true,
      lastSuccessfulContactAt: '2026-10-31T07:41:05.000Z',
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows all 5 indicators green when everything is online', async () => {
    render(<StatusStrip />);
    await flush();
    const strip = screen.getByText('EN').closest('.wms-strip') as HTMLElement;
    expect(strip).toHaveTextContent('SCALE 3 kg · READY');
    expect(strip).toHaveTextContent('SCALE 32 kg · READY');
    expect(strip).toHaveTextContent('SCANNER');
    expect(strip).toHaveTextContent('PRINTER');
    expect(strip).toHaveTextContent('ORGATEX · LINKED 07:41');
    expect(strip.querySelectorAll('.dot.down')).toHaveLength(0);
  });

  it('shows OFFLINE and a red dot for an offline scale, within the poll interval', async () => {
    vi.mocked(devices.getScaleStatus).mockImplementation((scaleId) =>
      scaleStatus(scaleId !== 'scale-3kg'),
    );
    render(<StatusStrip />);
    await flush();
    expect(screen.getByText(/SCALE 3 kg · OFFLINE/)).toBeInTheDocument();
  });

  it('re-polls at the 1 Hz interval and reflects a device going offline without remounting', async () => {
    render(<StatusStrip />);
    await flush();
    expect(screen.getByText('SCANNER').querySelector('.dot')).toHaveClass('up');

    vi.mocked(devices.getScannerStatus).mockResolvedValue({ online: false });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    await flush();
    expect(screen.getByText('SCANNER').querySelector('.dot')).toHaveClass('down');
  });

  it('shows UNAVAILABLE for OrgaTEX when offline', async () => {
    vi.mocked(devices.getOrgatexStatus).mockResolvedValue({
      online: false,
      lastSuccessfulContactAt: null,
    });
    render(<StatusStrip />);
    await flush();
    expect(screen.getByText('ORGATEX · UNAVAILABLE')).toBeInTheDocument();
  });

  it('shows EN and a live clock', async () => {
    render(<StatusStrip />);
    await flush();
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
  });
});
