// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { Barcode } from '../../../src/client/features/confirm-print/Barcode';

describe('Barcode', () => {
  it('renders 48 decorative bars, hidden from the accessibility tree', () => {
    const { container } = render(<Barcode value="B-24187" />);
    const root = container.querySelector('.wms-barcode');
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root?.querySelectorAll('i')).toHaveLength(48);
  });

  it('is deterministic for the same value', () => {
    const a = render(<Barcode value="B-24187" />).container.innerHTML;
    const b = render(<Barcode value="B-24187" />).container.innerHTML;
    expect(a).toBe(b);
  });

  it('differs for a different value', () => {
    const a = render(<Barcode value="B-24187" />).container.innerHTML;
    const b = render(<Barcode value="B-24188" />).container.innerHTML;
    expect(a).not.toBe(b);
  });
});
