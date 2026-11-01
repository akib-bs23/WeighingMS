import {
  formatElapsed,
  formatTime,
} from '../../../src/client/features/confirm-print/format-elapsed';

describe('formatElapsed', () => {
  it.each([
    [401_000, '6 min 41 s'],
    [0, '0 min 0 s'],
    [59_000, '0 min 59 s'],
    [60_000, '1 min 0 s'],
  ])('%i ms -> %s', (ms, expected) => {
    expect(formatElapsed(ms)).toBe(expected);
  });
});

describe('formatTime', () => {
  it('extracts HH:MM:SS from an ISO instant', () => {
    expect(formatTime('2026-10-30T07:48:22.123Z')).toBe('07:48:22');
  });
});
