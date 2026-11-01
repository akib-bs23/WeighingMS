// @vitest-environment jsdom
import { render } from '@testing-library/react';
import {
  useFunctionKeys,
  type FunctionKeyHandlers,
} from '../../../src/client/hooks/use-function-keys';

function Harness(props: FunctionKeyHandlers) {
  useFunctionKeys(props);
  return null;
}

function press(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }));
}

describe('useFunctionKeys', () => {
  it('invokes the matching handler on F1–F4', () => {
    const F1 = vi.fn();
    const F2 = vi.fn();
    const F3 = vi.fn();
    const F4 = vi.fn();
    render(<Harness enabled F1={F1} F2={F2} F3={F3} F4={F4} />);

    press('F1');
    press('F2');
    press('F3');
    press('F4');
    expect(F1).toHaveBeenCalledTimes(1);
    expect(F2).toHaveBeenCalledTimes(1);
    expect(F3).toHaveBeenCalledTimes(1);
    expect(F4).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a key with no handler', () => {
    const F1 = vi.fn();
    render(<Harness enabled F1={F1} />);
    press('F2');
    expect(F1).not.toHaveBeenCalled();
  });

  it('ignores every key while disabled (e.g. a dialog is open)', () => {
    const F1 = vi.fn();
    render(<Harness enabled={false} F1={F1} />);
    press('F1');
    expect(F1).not.toHaveBeenCalled();
  });

  it('picks up a changed handler without re-registering the listener', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Harness enabled F1={first} />);
    rerender(<Harness enabled F1={second} />);
    press('F1');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops listening after unmount', () => {
    const F1 = vi.fn();
    const { unmount } = render(<Harness enabled F1={F1} />);
    unmount();
    press('F1');
    expect(F1).not.toHaveBeenCalled();
  });

  it('ignores an ordinary letter key', () => {
    const F1 = vi.fn();
    render(<Harness enabled F1={F1} />);
    press('a');
    expect(F1).not.toHaveBeenCalled();
  });
});
