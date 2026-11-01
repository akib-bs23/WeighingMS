// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { request } from '../../../src/client/net/http';
import { useLiveWeight } from '../../../src/client/features/weighing/useLiveWeight';
import type { ScaleStatus } from '../../../src/shared/contracts/devices';
import type { WeightReading } from '../../../src/shared/contracts/devices';

vi.mock('../../../src/client/net/http');

function reading(netMg: number, readAt: string, stable = true): WeightReading {
  return { scaleId: 'scale-3kg', netMg, stable, overload: false, error: null, readAt };
}

function status(capacityMg = 3_000_000): ScaleStatus {
  return { scaleId: 'scale-3kg', online: true, state: 'READY', capacityMg, resolutionMg: 100 };
}

/** Routes `/status` calls separately from a sequential queue of weight-poll responses, since
 *  both go through the same mocked `request` function. */
function mockRequest(weightSequence: (WeightReading | Error)[]): void {
  let i = 0;
  vi.mocked(request).mockImplementation((path: unknown) => {
    if (typeof path === 'string' && path.endsWith('/status')) return Promise.resolve(status());
    const next = weightSequence[Math.min(i, weightSequence.length - 1)];
    i += 1;
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
}

function Harness({ scaleId, active }: { scaleId: string | null; active: boolean }) {
  const { reading, offline, capacityMg } = useLiveWeight(scaleId, active);
  return (
    <div>
      <div data-testid="reading">{reading ? String(reading.netMg) : 'null'}</div>
      <div data-testid="offline">{String(offline)}</div>
      <div data-testid="capacity">{String(capacityMg)}</div>
    </div>
  );
}

function netMg(): string | null {
  return screen.getByTestId('reading').textContent;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useLiveWeight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('applies the first poll immediately on mount', async () => {
    mockRequest([reading(94_000, '2026-10-30T00:00:00.100Z')]);
    render(<Harness scaleId="scale-3kg" active />);
    await flush();
    expect(netMg()).toBe('94000');
    expect(request).toHaveBeenCalledWith('/scales/scale-3kg/weight');
  });

  it('fetches the scale capacity once, separately from the weight poll', async () => {
    mockRequest([reading(0, '2026-10-30T00:00:00.100Z')]);
    render(<Harness scaleId="scale-3kg" active />);
    await flush();
    expect(screen.getByTestId('capacity')).toHaveTextContent('3000000');
    expect(request).toHaveBeenCalledWith('/scales/scale-3kg/status');
  });

  it('reports offline when a poll fails, back online on the next success', async () => {
    mockRequest([
      reading(10_000, '2026-10-30T00:00:00.000Z'),
      new Error('SCALE_UNAVAILABLE'),
      reading(20_000, '2026-10-30T00:00:00.100Z'),
    ]);
    render(<Harness scaleId="scale-3kg" active />);
    await flush();
    expect(screen.getByTestId('offline')).toHaveTextContent('false');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(screen.getByTestId('offline')).toHaveTextContent('true');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(screen.getByTestId('offline')).toHaveTextContent('false');
  });

  it('polls every 100 ms and applies newer readings', async () => {
    mockRequest([
      reading(10_000, '2026-10-30T00:00:00.000Z'),
      reading(20_000, '2026-10-30T00:00:00.100Z'),
      reading(30_000, '2026-10-30T00:00:00.200Z'),
    ]);
    render(<Harness scaleId="scale-3kg" active />);
    await flush();
    expect(netMg()).toBe('10000');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(netMg()).toBe('20000');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(netMg()).toBe('30000');
  });

  it('ignores a stale/out-of-order response (same or earlier readAt)', async () => {
    mockRequest([
      reading(50_000, '2026-10-30T00:00:00.200Z'),
      reading(10_000, '2026-10-30T00:00:00.050Z'), // arrives late, older
    ]);
    render(<Harness scaleId="scale-3kg" active />);
    await flush();
    expect(netMg()).toBe('50000');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(netMg()).toBe('50000'); // unchanged — the stale reading was discarded
  });

  it('resets reading/offline/capacity when the scale changes, then applies the new scale´s reading', async () => {
    mockRequest([reading(94_000, '2026-10-30T00:00:00.100Z')]);
    const { rerender } = render(<Harness scaleId="scale-3kg" active />);
    await flush();
    expect(netMg()).toBe('94000');

    mockRequest([reading(24_000_000, '2026-10-30T00:00:01.000Z')]);
    rerender(<Harness scaleId="scale-32kg" active />);
    expect(netMg()).toBe('null'); // cleared synchronously on the scale change
    expect(screen.getByTestId('capacity')).toHaveTextContent('null');
    await flush();
    expect(netMg()).toBe('24000000');
    expect(request).toHaveBeenLastCalledWith('/scales/scale-32kg/weight');
  });

  it('does not poll or fetch capacity when inactive or no scale is selected', async () => {
    mockRequest([reading(1, '2026-10-30T00:00:00.000Z')]);
    const { rerender } = render(<Harness scaleId={null} active />);
    await flush();
    expect(request).not.toHaveBeenCalled();

    rerender(<Harness scaleId="scale-3kg" active={false} />);
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(request).not.toHaveBeenCalled();

    rerender(<Harness scaleId="scale-3kg" active />);
    await flush();
    expect(request).toHaveBeenCalled();
  });

  it('stops polling on unmount', async () => {
    mockRequest([reading(1, '2026-10-30T00:00:00.000Z')]);
    const { unmount } = render(<Harness scaleId="scale-3kg" active />);
    await flush();
    unmount();
    vi.mocked(request).mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(request).not.toHaveBeenCalled();
  });
});
