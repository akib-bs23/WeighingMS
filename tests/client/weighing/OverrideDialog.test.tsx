// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverrideDialog } from '../../../src/client/features/weighing/OverrideDialog';

describe('OverrideDialog', () => {
  it('disables Authorise until both PIN and reason are filled in', async () => {
    render(<OverrideDialog busy={false} error={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    const authorise = screen.getByRole('button', { name: 'Authorise' });
    expect(authorise).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Supervisor PIN'), '4825');
    expect(authorise).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Reason'), 'Lab approved');
    expect(authorise).not.toBeDisabled();
  });

  it('a whitespace-only reason still leaves Authorise disabled', async () => {
    render(<OverrideDialog busy={false} error={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Supervisor PIN'), '4825');
    await userEvent.type(screen.getByLabelText('Reason'), '   ');
    expect(screen.getByRole('button', { name: 'Authorise' })).toBeDisabled();
  });

  it('submits the typed PIN and reason', async () => {
    const onSubmit = vi.fn();
    render(<OverrideDialog busy={false} error={null} onSubmit={onSubmit} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Supervisor PIN'), '4825');
    await userEvent.type(screen.getByLabelText('Reason'), 'Lab approved');
    await userEvent.click(screen.getByRole('button', { name: 'Authorise' }));
    expect(onSubmit).toHaveBeenCalledWith('4825', 'Lab approved');
  });

  it('shows the server-provided error message', () => {
    render(
      <OverrideDialog
        busy={false}
        error="Supervisor authentication failed"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Supervisor authentication failed');
  });

  it('disables both buttons while busy', () => {
    render(<OverrideDialog busy error={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Authorise' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('Cancel calls onCancel', async () => {
    const onCancel = vi.fn();
    render(<OverrideDialog busy={false} error={null} onSubmit={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders as an accessible modal dialog', () => {
    render(<OverrideDialog busy={false} error={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Supervisor override' })).toBeInTheDocument();
  });
});
