import { nextActive, type ProgressibleComponent } from '../../../src/shared/weighing/progression';

const c = (
  componentId: string,
  sequence: number,
  state: ProgressibleComponent['state'],
): ProgressibleComponent => ({
  componentId,
  sequence,
  state,
});

describe('nextActive', () => {
  it('picks the first pending component by sequence', () => {
    const components = [c('a', 1, 'DONE'), c('b', 2, 'PENDING'), c('c', 3, 'PENDING')];
    expect(nextActive(components)?.componentId).toBe('b');
  });

  it('returns the first pending by sequence even when the operator jumped ahead (story 011 edge case)', () => {
    // Confirmed component 4 out of order; 2 and 3 are still pending — progression must return 2.
    const components = [
      c('1', 1, 'DONE'),
      c('2', 2, 'PENDING'),
      c('3', 3, 'PENDING'),
      c('4', 4, 'DONE'),
      c('5', 5, 'PENDING'),
    ];
    expect(nextActive(components)?.componentId).toBe('2');
  });

  it('is indifferent to array order, only sequence matters', () => {
    const components = [c('b', 2, 'PENDING'), c('a', 1, 'PENDING')];
    expect(nextActive(components)?.componentId).toBe('a');
  });

  it('returns null when nothing is pending', () => {
    const components = [c('a', 1, 'DONE'), c('b', 2, 'DONE')];
    expect(nextActive(components)).toBeNull();
  });

  it('ignores the currently active component', () => {
    const components = [c('a', 1, 'ACTIVE'), c('b', 2, 'PENDING')];
    expect(nextActive(components)?.componentId).toBe('b');
  });
});
