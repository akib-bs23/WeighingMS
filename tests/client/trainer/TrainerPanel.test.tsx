// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as training from '../../../src/client/net/training';
import { TrainerPanel } from '../../../src/client/features/trainer/TrainerPanel';
import type { ComponentView } from '../../../src/shared/contracts/weighing';

vi.mock('../../../src/client/net/training');

const ACTIVE: ComponentView = {
  componentId: 'RC-2',
  sequence: 2,
  state: 'ACTIVE',
  dyestuff: { code: 'D-002', name: 'Red RB', type: 'DYE', colourHex: '#000000', barcode: 'D-002' },
  lotId: 'LOT-2',
  containerId: 'C-11',
  scaleId: 'scale-3kg',
  scaleClass: 'PRECISION',
  uom: 'g',
  targetMg: 94_000,
  toleranceMg: 500,
  displayMaxMg: 150_000,
  tareMg: 214_000,
  identity: 'UNVERIFIED',
  identityMismatchDetail: null,
};

describe('TrainerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(training.rampScale).mockResolvedValue({
      scaleId: 'scale-3kg',
      netMg: 0,
      stable: true,
      overload: false,
      error: null,
      readAt: '2026-10-30T00:00:00.000Z',
    });
    vi.mocked(training.setScaleWeight).mockResolvedValue({
      scaleId: 'scale-3kg',
      netMg: 0,
      stable: true,
      overload: false,
      error: null,
      readAt: '2026-10-30T00:00:00.000Z',
    });
    vi.mocked(training.setScaleOnline).mockResolvedValue(undefined);
    vi.mocked(training.setScannerOnline).mockResolvedValue({ online: true });
    vi.mocked(training.setOrgatexOnline).mockResolvedValue(undefined);
    vi.mocked(training.injectScan).mockResolvedValue({
      seq: 1,
      code: 'B-24187',
      scannedAt: '2026-10-30T00:00:00.000Z',
    });
    vi.mocked(training.resetScenario).mockResolvedValue({
      reset: [],
      resetAt: '2026-10-30T00:00:00.000Z',
    });
  });

  it('simulate dispense ramps the active component scale to target + 0.4 × tolerance', async () => {
    render(<TrainerPanel activeComponent={ACTIVE} onAfterReset={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '▶ Simulate dispense' }));
    expect(training.rampScale).toHaveBeenCalledWith('scale-3kg', 94_200);
  });

  it('simulate overshoot ramps the active component scale to target + 4.8 × tolerance', async () => {
    render(<TrainerPanel activeComponent={ACTIVE} onAfterReset={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '▶ Simulate overshoot' }));
    expect(training.rampScale).toHaveBeenCalledWith('scale-3kg', 96_400);
  });

  it('dispense/overshoot are disabled with no active component', () => {
    render(<TrainerPanel activeComponent={null} onAfterReset={vi.fn()} />);
    expect(screen.getByRole('button', { name: '▶ Simulate dispense' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '▶ Simulate overshoot' })).toBeDisabled();
  });

  it('set weight converts grams to integer milligrams and calls the scale', async () => {
    render(<TrainerPanel activeComponent={ACTIVE} onAfterReset={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Set weight in grams'), '94.2');
    await userEvent.click(screen.getByRole('button', { name: 'Set weight' }));
    expect(training.setScaleWeight).toHaveBeenCalledWith('scale-3kg', 94_200);
  });

  it('set weight is disabled when the active component has no scale', () => {
    render(<TrainerPanel activeComponent={{ ...ACTIVE, scaleId: null }} onAfterReset={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Set weight' })).toBeDisabled();
  });

  it('each scale device toggle calls only that scale´s online endpoint', async () => {
    render(<TrainerPanel activeComponent={ACTIVE} onAfterReset={vi.fn()} />);
    const scale3 = within(screen.getByText('scale-3kg').closest('span') as HTMLElement);
    await userEvent.click(scale3.getByRole('button', { name: 'OFF' }));
    expect(training.setScaleOnline).toHaveBeenCalledWith('scale-3kg', false);

    const scale32 = within(screen.getByText('scale-32kg').closest('span') as HTMLElement);
    await userEvent.click(scale32.getByRole('button', { name: 'ON' }));
    expect(training.setScaleOnline).toHaveBeenCalledWith('scale-32kg', true);
  });

  it('scanner device toggle calls the scanner online endpoint only', async () => {
    render(<TrainerPanel activeComponent={ACTIVE} onAfterReset={vi.fn()} />);
    const scanner = within(screen.getByText('scanner').closest('span') as HTMLElement);
    await userEvent.click(scanner.getByRole('button', { name: 'OFF' }));
    expect(training.setScannerOnline).toHaveBeenCalledWith(false);
    expect(training.setScaleOnline).not.toHaveBeenCalled();
    expect(training.setOrgatexOnline).not.toHaveBeenCalled();
  });

  it('OrgaTEX device toggle calls the orgatex online endpoint only', async () => {
    render(<TrainerPanel activeComponent={ACTIVE} onAfterReset={vi.fn()} />);
    const orgatex = within(screen.getByText('OrgaTEX').closest('span') as HTMLElement);
    await userEvent.click(orgatex.getByRole('button', { name: 'OFF' }));
    expect(training.setOrgatexOnline).toHaveBeenCalledWith(false);
    expect(training.setScannerOnline).not.toHaveBeenCalled();
  });

  it('injects the typed scan code and clears the input', async () => {
    render(<TrainerPanel activeComponent={ACTIVE} onAfterReset={vi.fn()} />);
    const input = screen.getByLabelText('Code to inject');
    await userEvent.type(input, 'B-24187');
    await userEvent.click(screen.getByRole('button', { name: 'Inject scan' }));
    expect(training.injectScan).toHaveBeenCalledWith('B-24187');
    await waitFor(() => expect(input).toHaveValue(''));
  });

  it('does not inject a blank scan code', async () => {
    render(<TrainerPanel activeComponent={ACTIVE} onAfterReset={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Inject scan' }));
    expect(training.injectScan).not.toHaveBeenCalled();
  });

  it('reset scenario calls the reset endpoint and then the onAfterReset callback', async () => {
    const onAfterReset = vi.fn();
    render(<TrainerPanel activeComponent={ACTIVE} onAfterReset={onAfterReset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reset scenario' }));
    expect(training.resetScenario).toHaveBeenCalled();
    await waitFor(() => {
      expect(onAfterReset).toHaveBeenCalled();
    });
  });
});
