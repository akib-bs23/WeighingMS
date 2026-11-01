// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, request } from '../../../src/client/net/http';
import * as weighing from '../../../src/client/net/weighing';
import { WeighScreen } from '../../../src/client/features/weighing/WeighScreen';
import { messages } from '../../../src/client/i18n/messages';
import type { ComponentView, SessionView } from '../../../src/shared/contracts/weighing';
import type { WeightReading } from '../../../src/shared/contracts/devices';

// Keeps the real ApiError class (so `instanceof` checks in useWeighActions.ts still work)
// while only mocking `request`, which useLiveWeight's polling needs to control.
vi.mock('../../../src/client/net/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/client/net/http')>();
  return { ...actual, request: vi.fn() };
});
vi.mock('../../../src/client/net/weighing');

function dyestuff(name: string, code: string) {
  return { code, name, type: 'DYE' as const, colourHex: '#000000', barcode: code };
}

const DONE: ComponentView = {
  componentId: 'RC-1',
  sequence: 1,
  state: 'DONE',
  dyestuff: dyestuff('Blue RSPL', 'D-001'),
  lotId: 'LOT-1',
  containerId: 'C-09',
  scaleId: 'scale-3kg',
  scaleClass: 'PRECISION',
  uom: 'g',
  targetMg: 50_000,
  toleranceMg: 500,
  displayMaxMg: 150_000,
  tareMg: 214_000,
  identity: 'UNVERIFIED',
  identityMismatchDetail: null,
};

const ACTIVE: ComponentView = {
  componentId: 'RC-2',
  sequence: 2,
  state: 'ACTIVE',
  dyestuff: dyestuff('Red RB', 'D-002'),
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

const PENDING: ComponentView = {
  componentId: 'RC-3',
  sequence: 3,
  state: 'PENDING',
  dyestuff: dyestuff('Sodium Sulphate', 'D-003'),
  lotId: 'LOT-3',
  containerId: 'D-03',
  scaleId: null,
  scaleClass: 'FLOOR',
  uom: 'kg',
  targetMg: 24_000_000,
  toleranceMg: 100_000,
  displayMaxMg: 32_000_000,
  tareMg: null,
  identity: 'UNVERIFIED',
  identityMismatchDetail: null,
};

function session(components: ComponentView[], activeComponentId: string | null): SessionView {
  return {
    sessionId: 'session-1',
    batchId: 'B-24187',
    orderRef: 'SO-9931',
    machineRef: 'JET-04',
    shadeCode: 'Teal 4C',
    stationId: 'STN-01',
    operatorId: 'OP-001',
    status: 'IN_PROGRESS',
    activeComponentId,
    startedAt: '2026-10-30T00:00:00.000Z',
    completedAt: null,
    components,
  };
}

function reading(netMg: number, readAt: string, stable = true): WeightReading {
  return { scaleId: 'scale-3kg', netMg, stable, overload: false, error: null, readAt };
}

/** Routes `/status` calls to a scale status (capacity 3 000 000 mg) separately from the weight
 *  poll, since both go through the same mocked `request` function. */
function mockRequest(weightResponse: WeightReading | Error): void {
  vi.mocked(request).mockImplementation((path: unknown) => {
    if (typeof path === 'string' && path.endsWith('/status')) {
      return Promise.resolve({
        scaleId: 'scale-3kg',
        online: true,
        state: 'READY',
        capacityMg: 3_000_000,
        resolutionMg: 100,
      });
    }
    return weightResponse instanceof Error
      ? Promise.reject(weightResponse)
      : Promise.resolve(weightResponse);
  });
}

describe('WeighScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the recipe rail summary, header identity and scale badge for the active component', () => {
    vi.mocked(request).mockResolvedValue(reading(0, '2026-10-30T00:00:00.100Z'));
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={vi.fn()}
        onBatchCompleted={vi.fn()}
      />,
    );

    expect(screen.getByText('1 of 3 components weighed')).toBeInTheDocument();
    expect(screen.getByText('Red RB', { selector: '.wms-weigh-head .nm' })).toBeInTheDocument();
    expect(screen.getByText(/LOT LOT-2/)).toBeInTheDocument();
    expect(screen.getByText(/CONTAINER C-11/)).toBeInTheDocument();
    expect(screen.getByText(/TARE 214\.0 g/)).toBeInTheDocument();
    expect(screen.getByText('3 kg precision')).toBeInTheDocument();
  });

  it('a done row is inert — clicking it never activates a component', async () => {
    vi.mocked(request).mockResolvedValue(reading(0, '2026-10-30T00:00:00.100Z'));
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={vi.fn()}
        onBatchCompleted={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Blue RSPL, done' }));
    expect(weighing.activateComponent).not.toHaveBeenCalled();
  });

  it('clicking a pending row activates it and applies the returned session', async () => {
    vi.mocked(request).mockResolvedValue(reading(0, '2026-10-30T00:00:00.100Z'));
    const updated = session(
      [DONE, { ...ACTIVE, state: 'DONE' }, { ...PENDING, state: 'ACTIVE' }],
      'RC-3',
    );
    vi.mocked(weighing.activateComponent).mockResolvedValue(updated);
    const onSessionUpdate = vi.fn();
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={onSessionUpdate}
        onBatchCompleted={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sodium Sulphate, pending' }));
    expect(weighing.activateComponent).toHaveBeenCalledWith('session-1', 'RC-3');
    await waitFor(() => {
      expect(onSessionUpdate).toHaveBeenCalledWith(updated);
    });
  });

  it('shows a completing message and triggers completion when every component is done', () => {
    vi.mocked(weighing.complete).mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <WeighScreen
        session={session([DONE], null)}
        shadeCode="Teal 4C"
        onSessionUpdate={vi.fn()}
        onBatchCompleted={vi.fn()}
      />,
    );
    expect(screen.getByText(messages.batchCompleting)).toBeInTheDocument();
    expect(weighing.complete).toHaveBeenCalledWith('session-1');
  });

  it('shows a select-pending prompt (not the completing message) when some components remain pending', () => {
    render(
      <WeighScreen
        session={session([DONE, PENDING], null)}
        shadeCode="Teal 4C"
        onSessionUpdate={vi.fn()}
        onBatchCompleted={vi.fn()}
      />,
    );
    expect(screen.getByText(messages.selectPendingComponent)).toBeInTheDocument();
    expect(weighing.complete).not.toHaveBeenCalled();
  });

  describe('tolerance boundaries (target 94.0 g ± 0.5 g)', () => {
    it.each([
      { g: 84_600, zone: 'near', confirmable: false, status: 'DISPENSE — 9.4 g REMAINING' },
      { g: 93_400, zone: 'near', confirmable: false, status: 'DISPENSE — 0.6 g REMAINING' },
      {
        g: 93_500,
        zone: 'ok',
        confirmable: true,
        status: 'WITHIN TOLERANCE — PRESS OK TO CONFIRM',
      },
      {
        g: 94_500,
        zone: 'ok',
        confirmable: true,
        status: 'WITHIN TOLERANCE — PRESS OK TO CONFIRM',
      },
      { g: 94_600, zone: 'over', confirmable: false, status: 'OVER TOLERANCE — SURPLUS +0.6 g' },
    ])('$g mg → zone $zone, confirmable $confirmable', async ({ g, zone, confirmable, status }) => {
      vi.mocked(request).mockResolvedValue(reading(g, '2026-10-30T00:00:00.100Z'));
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );

      await screen.findByText(status);
      expect(screen.getByRole('progressbar')).toHaveAttribute('data-zone', zone);
      const ok = screen.getByRole('button', { name: 'OK · Confirm' });
      if (confirmable) {
        expect(ok).not.toBeDisabled();
      } else {
        expect(ok).toBeDisabled();
      }
    });

    it('an unstable reading inside the band cannot be confirmed', async () => {
      vi.mocked(request).mockResolvedValue(reading(94_000, '2026-10-30T00:00:00.100Z', false));
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );

      await screen.findByText('WITHIN TOLERANCE — PRESS OK TO CONFIRM');
      expect(screen.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
    });
  });

  it('confirming calls the confirm endpoint and applies the returned session', async () => {
    vi.mocked(request).mockResolvedValue(reading(94_000, '2026-10-30T00:00:00.100Z'));
    const nextSession = session([DONE, { ...ACTIVE, state: 'DONE' }, PENDING], null);
    vi.mocked(weighing.confirm).mockResolvedValue({
      record: {
        recordId: 'rec-1',
        sessionId: 'session-1',
        componentId: 'RC-2',
        lotId: 'LOT-2',
        containerId: 'C-11',
        tareMg: 214_000,
        scaleId: 'scale-3kg',
        targetMg: 94_000,
        toleranceMinMg: 93_500,
        toleranceMaxMg: 94_500,
        actualMg: 94_000,
        uom: 'g',
        result: 'IN_TOLERANCE',
        operatorId: 'OP-001',
        confirmedAt: '2026-10-30T00:00:01.000Z',
        override: null,
      },
      session: nextSession,
    });
    const onSessionUpdate = vi.fn();
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={onSessionUpdate}
        onBatchCompleted={vi.fn()}
      />,
    );

    await screen.findByText('WITHIN TOLERANCE — PRESS OK TO CONFIRM');
    await userEvent.click(screen.getByRole('button', { name: 'OK · Confirm' }));

    expect(weighing.confirm).toHaveBeenCalledWith('session-1');
    await waitFor(() => {
      expect(onSessionUpdate).toHaveBeenCalledWith(nextSession);
    });
  });

  it('re-tare calls the retare endpoint and applies the returned session', async () => {
    vi.mocked(request).mockResolvedValue(reading(0, '2026-10-30T00:00:00.100Z'));
    const retared = session([DONE, ACTIVE, PENDING], 'RC-2');
    vi.mocked(weighing.retare).mockResolvedValue(retared);
    const onSessionUpdate = vi.fn();
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={onSessionUpdate}
        onBatchCompleted={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Re-tare' }));
    expect(weighing.retare).toHaveBeenCalledWith('session-1');
    await waitFor(() => {
      expect(onSessionUpdate).toHaveBeenCalledWith(retared);
    });
  });

  it('Quit calls the quit endpoint and applies the returned session', async () => {
    vi.mocked(request).mockResolvedValue(reading(0, '2026-10-30T00:00:00.100Z'));
    const quitted = session([DONE, ACTIVE, PENDING], null);
    vi.mocked(weighing.quit).mockResolvedValue(quitted);
    const onSessionUpdate = vi.fn();
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={onSessionUpdate}
        onBatchCompleted={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Quit' }));
    expect(weighing.quit).toHaveBeenCalledWith('session-1');
    await waitFor(() => {
      expect(onSessionUpdate).toHaveBeenCalledWith(quitted);
    });
  });

  it('Supervisor override opens a dialog requiring both PIN and reason', async () => {
    vi.mocked(request).mockResolvedValue(reading(0, '2026-10-30T00:00:00.100Z'));
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={vi.fn()}
        onBatchCompleted={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Supervisor override' }));
    const dialog = screen.getByRole('dialog', { name: 'Supervisor override' });
    const authorise = within(dialog).getByRole('button', { name: 'Authorise' });
    expect(authorise).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Supervisor PIN'), '4825');
    expect(authorise).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Lab approved');
    expect(authorise).not.toBeDisabled();
  });

  it('Cancel closes the override dialog without calling the endpoint', async () => {
    vi.mocked(request).mockResolvedValue(reading(0, '2026-10-30T00:00:00.100Z'));
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={vi.fn()}
        onBatchCompleted={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Supervisor override' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(weighing.authoriseOverride).not.toHaveBeenCalled();
  });

  it('authorising the override calls the endpoint and applies the returned session', async () => {
    vi.mocked(request).mockResolvedValue(reading(93_000, '2026-10-30T00:00:00.100Z'));
    const overridden = session([DONE, { ...ACTIVE, state: 'DONE' }, PENDING], null);
    vi.mocked(weighing.authoriseOverride).mockResolvedValue({
      record: {
        recordId: 'rec-2',
        sessionId: 'session-1',
        componentId: 'RC-2',
        lotId: 'LOT-2',
        containerId: 'C-11',
        tareMg: 214_000,
        scaleId: 'scale-3kg',
        targetMg: 94_000,
        toleranceMinMg: 93_500,
        toleranceMaxMg: 94_500,
        actualMg: 93_000,
        uom: 'g',
        result: 'OVERRIDDEN',
        operatorId: 'OP-001',
        confirmedAt: '2026-10-30T00:00:01.000Z',
        override: {
          supervisorId: 'SV-001',
          reason: 'Lab approved',
          authorisedAt: '2026-10-30T00:00:01.000Z',
        },
      },
      session: overridden,
    });
    const onSessionUpdate = vi.fn();
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={onSessionUpdate}
        onBatchCompleted={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Supervisor override' }));
    const dialog = screen.getByRole('dialog', { name: 'Supervisor override' });
    await userEvent.type(within(dialog).getByLabelText('Supervisor PIN'), '4825');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Lab approved');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Authorise' }));

    expect(weighing.authoriseOverride).toHaveBeenCalledWith('session-1', '4825', 'Lab approved');
    await waitFor(() => {
      expect(onSessionUpdate).toHaveBeenCalledWith(overridden);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a wrong PIN shows the server error and keeps the dialog open', async () => {
    vi.mocked(request).mockResolvedValue(reading(93_000, '2026-10-30T00:00:00.100Z'));
    vi.mocked(weighing.authoriseOverride).mockRejectedValue(
      new ApiError(401, 'SUPERVISOR_AUTH_FAILED', 'Supervisor authentication failed'),
    );
    render(
      <WeighScreen
        session={session([DONE, ACTIVE, PENDING], 'RC-2')}
        shadeCode="Teal 4C"
        onSessionUpdate={vi.fn()}
        onBatchCompleted={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Supervisor override' }));
    const dialog = screen.getByRole('dialog', { name: 'Supervisor override' });
    await userEvent.type(within(dialog).getByLabelText('Supervisor PIN'), '0000');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Lab approved');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Authorise' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Supervisor authentication failed',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  describe('identity scanning (story 007/005)', () => {
    it("scanning the active component's own code shows VERIFIED in the header", async () => {
      vi.mocked(request).mockResolvedValue(reading(0, '2026-10-30T00:00:00.100Z'));
      vi.mocked(weighing.verifyIdentity).mockResolvedValue(
        session([DONE, { ...ACTIVE, identity: 'VERIFIED' }, PENDING], 'RC-2'),
      );
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );
      await userEvent.keyboard('D-002{Enter}');
      expect(weighing.verifyIdentity).toHaveBeenCalledWith('session-1', 'D-002');
    });

    it('a mismatch blocks confirm even when the reading is in tolerance', async () => {
      vi.mocked(request).mockResolvedValue(reading(94_000, '2026-10-30T00:00:00.100Z'));
      render(
        <WeighScreen
          session={session(
            [
              DONE,
              {
                ...ACTIVE,
                identity: 'MISMATCH',
                identityMismatchDetail: 'Wrong dyestuff: scanned D-003, expected D-002',
              },
              PENDING,
            ],
            'RC-2',
          )}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );
      expect(
        await screen.findByText(/Wrong dyestuff: scanned D-003, expected D-002/),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
    });
  });

  describe('function keys (story 008)', () => {
    it('F1 confirms when enabled', async () => {
      vi.mocked(request).mockResolvedValue(reading(94_000, '2026-10-30T00:00:00.100Z'));
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );
      await screen.findByText('WITHIN TOLERANCE — PRESS OK TO CONFIRM');
      await userEvent.keyboard('{F1}');
      expect(weighing.confirm).toHaveBeenCalledWith('session-1');
    });

    it('F2 re-tares and F4 quits', async () => {
      vi.mocked(request).mockResolvedValue(reading(0, '2026-10-30T00:00:00.100Z'));
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );
      await userEvent.keyboard('{F2}');
      expect(weighing.retare).toHaveBeenCalledWith('session-1');
      await userEvent.keyboard('{F4}');
      expect(weighing.quit).toHaveBeenCalledWith('session-1');
    });

    it('F-keys do nothing while the override dialog is open', async () => {
      vi.mocked(request).mockResolvedValue(reading(94_000, '2026-10-30T00:00:00.100Z'));
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );
      await screen.findByText('WITHIN TOLERANCE — PRESS OK TO CONFIRM');
      await userEvent.click(screen.getByRole('button', { name: 'Supervisor override' }));
      await userEvent.keyboard('{F1}');
      expect(weighing.confirm).not.toHaveBeenCalled();
      await userEvent.keyboard('{F4}');
      expect(weighing.quit).not.toHaveBeenCalled();
    });
  });

  describe('reading safety (story 007)', () => {
    it('shows SCALE OFFLINE and disables OK when the scale poll fails', async () => {
      mockRequest(new Error('SCALE_UNAVAILABLE'));
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );
      expect(await screen.findByText('SCALE OFFLINE', { exact: true })).toBeInTheDocument();
      expect(screen.getByText('SCALE OFFLINE — CONFIRM UNAVAILABLE')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
    });

    it('recovers once the scale starts responding again', async () => {
      mockRequest(new Error('SCALE_UNAVAILABLE'));
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );
      await screen.findByText('SCALE OFFLINE', { exact: true });
      mockRequest(reading(94_000, '2026-10-30T00:00:00.100Z'));
      expect(await screen.findByText('WITHIN TOLERANCE — PRESS OK TO CONFIRM')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled();
    });

    it.each([
      ['a negative reading', -5_000],
      ['an overload reading (3 500 g on the 3 kg scale)', 3_500_000],
    ])('shows INVALID READING and disables OK for %s', async (_, netMg) => {
      mockRequest(reading(netMg, '2026-10-30T00:00:00.100Z'));
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );
      expect(await screen.findByText('INVALID READING', { exact: true })).toBeInTheDocument();
      expect(screen.getByText('INVALID READING — CONFIRM UNAVAILABLE')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OK · Confirm' })).toBeDisabled();
    });

    it('a valid, in-tolerance reading is unaffected by the new safety checks', async () => {
      mockRequest(reading(94_000, '2026-10-30T00:00:00.100Z'));
      render(
        <WeighScreen
          session={session([DONE, ACTIVE, PENDING], 'RC-2')}
          shadeCode="Teal 4C"
          onSessionUpdate={vi.fn()}
          onBatchCompleted={vi.fn()}
        />,
      );
      expect(await screen.findByText('WITHIN TOLERANCE — PRESS OK TO CONFIRM')).toBeInTheDocument();
      expect(screen.queryByText('SCALE OFFLINE', { exact: true })).not.toBeInTheDocument();
      expect(screen.queryByText('INVALID READING', { exact: true })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OK · Confirm' })).toBeEnabled();
    });
  });
});
