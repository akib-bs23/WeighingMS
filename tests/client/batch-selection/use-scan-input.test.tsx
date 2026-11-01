// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import * as scanner from '../../../src/client/net/scanner';
import { useScanInput } from '../../../src/client/features/scan/use-scan-input';

vi.mock('../../../src/client/net/scanner');

function Harness({ active, onScan }: { active: boolean; onScan: (code: string) => void }) {
  useScanInput(active, onScan);
  return null;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useScanInput (scanner feed)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('ignores scans already in the feed when the screen opens, then delivers new ones', async () => {
    const onScan = vi.fn();
    vi.mocked(scanner.getScanEvents).mockResolvedValueOnce({
      events: [{ seq: 1, code: 'OLD-SCAN', scannedAt: new Date().toISOString() }],
      lastSeq: 1,
    });
    render(<Harness active onScan={onScan} />);
    await flush();
    expect(onScan).not.toHaveBeenCalled();

    vi.mocked(scanner.getScanEvents).mockResolvedValueOnce({
      events: [{ seq: 2, code: 'B-24187', scannedAt: new Date().toISOString() }],
      lastSeq: 2,
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onScan).toHaveBeenCalledWith('B-24187');
    expect(scanner.getScanEvents).toHaveBeenLastCalledWith(1);
  });

  it('does nothing while the scanner is unavailable (touch is unaffected elsewhere)', async () => {
    const onScan = vi.fn();
    vi.mocked(scanner.getScanEvents).mockRejectedValue(new Error('SCANNER_UNAVAILABLE'));
    render(<Harness active onScan={onScan} />);
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onScan).not.toHaveBeenCalled();
  });

  it('stops polling when no longer active', async () => {
    vi.mocked(scanner.getScanEvents).mockResolvedValue({ events: [], lastSeq: 0 });
    const { rerender } = render(<Harness active onScan={vi.fn()} />);
    await flush();
    rerender(<Harness active={false} onScan={vi.fn()} />);
    vi.mocked(scanner.getScanEvents).mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(scanner.getScanEvents).not.toHaveBeenCalled();
  });
});
