// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as ticketNet from '../../../src/client/net/ticket';
import * as writeBackNet from '../../../src/client/net/write-back';
import { ConfirmPrintScreen } from '../../../src/client/features/confirm-print/ConfirmPrintScreen';
import { messages } from '../../../src/client/i18n/messages';
import type { BatchSummaryView, SessionView } from '../../../src/shared/contracts/weighing';
import type { TicketState } from '../../../src/shared/contracts/ticket';

vi.mock('../../../src/client/net/ticket');
vi.mock('../../../src/client/net/write-back');

const SESSION: SessionView = {
  sessionId: 'session-1',
  batchId: 'B-24187',
  orderRef: 'SO-9931',
  machineRef: 'JET-04',
  shadeCode: 'Teal 4C',
  stationId: 'STN-01',
  operatorId: 'OP-001',
  status: 'COMPLETED',
  activeComponentId: null,
  startedAt: '2026-10-30T00:00:00.000Z',
  completedAt: '2026-10-30T00:06:41.000Z',
  components: [],
};

function summary(overrides: Partial<BatchSummaryView> = {}): BatchSummaryView {
  return {
    sessionId: 'session-1',
    batchId: 'B-24187',
    componentsDone: 5,
    componentsTotal: 5,
    allWithinTolerance: true,
    totalDispensedMg: 35_322_100,
    elapsedMs: 401_000,
    operatorName: 'R. Karim',
    writeBack: {
      sessionId: 'session-1',
      batchId: 'B-24187',
      status: 'CONFIRMED',
      consumptionId: 'c-1',
      confirmedAt: '2026-10-30T00:06:42.000Z',
      attempts: 1,
      lastError: null,
    },
    ...overrides,
  };
}

function ticketState(overrides: Partial<TicketState> = {}): TicketState {
  return {
    ticket: {
      ticketId: 'tkt-1',
      sessionId: 'session-1',
      batchId: 'B-24187',
      orderRef: 'SO-9931',
      machineRef: 'JET-04',
      shadeCode: 'Teal 4C',
      date: '2026-10-30 00:06',
      operatorName: 'R. Karim',
      lines: [
        { name: 'Remazol Brill. Blue RSPL', targetMg: 1_240_000, actualMg: 1_241_500, uom: 'g' },
      ],
      toleranceSummary: 'ALL WITHIN TOLERANCE',
      barcodeValue: 'B-24187',
    },
    status: 'PRINTED',
    jobId: 'job-1',
    printedAt: '2026-10-30T00:06:42.000Z',
    isReprint: false,
    attempts: 1,
    lastError: null,
    ...overrides,
  };
}

describe('ConfirmPrintScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the heading and summary rows', () => {
    vi.mocked(ticketNet.submitTicket).mockReturnValue(new Promise(() => {}));
    render(<ConfirmPrintScreen session={SESSION} summary={summary()} onNextBatch={vi.fn()} />);

    expect(screen.getByText('Batch B-24187 weighed')).toBeInTheDocument();
    expect(screen.getByText('5 of 5')).toBeInTheDocument();
    expect(screen.getByText('YES')).toBeInTheDocument();
    expect(screen.getByText('35.322 kg')).toBeInTheDocument();
    expect(screen.getByText('6 min 41 s')).toBeInTheDocument();
    expect(screen.getByText('R. Karim')).toBeInTheDocument();
    expect(screen.getByText('CONFIRMED 00:06:42')).toBeInTheDocument();
  });

  it('shows NO and the surplus-override wording is not asserted here (ticket owns it); summary just shows NO', () => {
    vi.mocked(ticketNet.submitTicket).mockReturnValue(new Promise(() => {}));
    render(
      <ConfirmPrintScreen
        session={SESSION}
        summary={summary({ allWithinTolerance: false })}
        onNextBatch={vi.fn()}
      />,
    );
    expect(screen.getByText('NO')).toBeInTheDocument();
  });

  it('shows PENDING with a Retry control when write-back has not confirmed', () => {
    vi.mocked(ticketNet.submitTicket).mockReturnValue(new Promise(() => {}));
    render(
      <ConfirmPrintScreen
        session={SESSION}
        summary={summary({
          writeBack: {
            sessionId: 'session-1',
            batchId: 'B-24187',
            status: 'PENDING',
            consumptionId: null,
            confirmedAt: null,
            attempts: 1,
            lastError: 'ORGATEX_UNAVAILABLE',
          },
        })}
        onNextBatch={vi.fn()}
      />,
    );
    expect(screen.getAllByText(messages.writeBackPending).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: messages.retry })).toBeInTheDocument();
  });

  it('retrying the write-back calls the endpoint and updates the status', async () => {
    vi.mocked(ticketNet.submitTicket).mockReturnValue(new Promise(() => {}));
    vi.mocked(writeBackNet.retryWriteBack).mockResolvedValue({
      sessionId: 'session-1',
      batchId: 'B-24187',
      status: 'CONFIRMED',
      consumptionId: 'c-1',
      confirmedAt: '2026-10-30T00:07:00.000Z',
      attempts: 2,
      lastError: null,
    });
    render(
      <ConfirmPrintScreen
        session={SESSION}
        summary={summary({
          writeBack: {
            sessionId: 'session-1',
            batchId: 'B-24187',
            status: 'PENDING',
            consumptionId: null,
            confirmedAt: null,
            attempts: 1,
            lastError: 'ORGATEX_UNAVAILABLE',
          },
        })}
        onNextBatch={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: messages.retry }));
    expect(writeBackNet.retryWriteBack).toHaveBeenCalledWith('session-1');
    await waitFor(() => {
      expect(screen.getByText('CONFIRMED 00:07:00')).toBeInTheDocument();
    });
  });

  it('composes the ticket on mount and shows it once loaded', async () => {
    vi.mocked(ticketNet.submitTicket).mockResolvedValue(ticketState());
    render(<ConfirmPrintScreen session={SESSION} summary={summary()} onNextBatch={vi.fn()} />);

    expect(ticketNet.submitTicket).toHaveBeenCalledWith('session-1');
    expect(await screen.findByText('FCI DYEING — WEIGHING TICKET')).toBeInTheDocument();
    expect(screen.getByText('ALL WITHIN TOLERANCE')).toBeInTheDocument();
  });

  it('the print button is disabled until the ticket has loaded', () => {
    vi.mocked(ticketNet.submitTicket).mockReturnValue(new Promise(() => {}));
    render(<ConfirmPrintScreen session={SESSION} summary={summary()} onNextBatch={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Print ticket/ })).toBeDisabled();
  });

  it('labels the button Reprint once the ticket is already PRINTED, and reprints on click', async () => {
    vi.mocked(ticketNet.submitTicket).mockResolvedValue(ticketState({ status: 'PRINTED' }));
    vi.mocked(ticketNet.reprintTicket).mockResolvedValue(
      ticketState({ isReprint: true, attempts: 2 }),
    );
    render(<ConfirmPrintScreen session={SESSION} summary={summary()} onNextBatch={vi.fn()} />);

    const button = await screen.findByRole('button', { name: /Reprint/ });
    await userEvent.click(button);
    expect(ticketNet.reprintTicket).toHaveBeenCalledWith('session-1');
    expect(ticketNet.retryTicket).not.toHaveBeenCalled();
  });

  it('retries (not reprints) a still-PENDING ticket on click', async () => {
    vi.mocked(ticketNet.submitTicket).mockResolvedValue(
      ticketState({ status: 'PENDING', lastError: 'PRINTER_UNAVAILABLE' }),
    );
    vi.mocked(ticketNet.retryTicket).mockResolvedValue(ticketState({ status: 'PRINTED' }));
    render(<ConfirmPrintScreen session={SESSION} summary={summary()} onNextBatch={vi.fn()} />);

    const button = await screen.findByRole('button', { name: /Print ticket/ });
    expect(screen.getByText(messages.printerUnavailable)).toBeInTheDocument();
    await userEvent.click(button);
    expect(ticketNet.retryTicket).toHaveBeenCalledWith('session-1');
    expect(ticketNet.reprintTicket).not.toHaveBeenCalled();
  });

  it('Next batch calls onNextBatch, including via F3', async () => {
    vi.mocked(ticketNet.submitTicket).mockReturnValue(new Promise(() => {}));
    const onNextBatch = vi.fn();
    render(<ConfirmPrintScreen session={SESSION} summary={summary()} onNextBatch={onNextBatch} />);
    await userEvent.click(screen.getByRole('button', { name: /Next batch/ }));
    expect(onNextBatch).toHaveBeenCalledTimes(1);

    await userEvent.keyboard('{F3}');
    expect(onNextBatch).toHaveBeenCalledTimes(2);
  });

  it('F1 prints/reprints once the ticket has loaded', async () => {
    vi.mocked(ticketNet.submitTicket).mockResolvedValue(ticketState({ status: 'PRINTED' }));
    vi.mocked(ticketNet.reprintTicket).mockResolvedValue(ticketState({ isReprint: true }));
    render(<ConfirmPrintScreen session={SESSION} summary={summary()} onNextBatch={vi.fn()} />);
    await screen.findByText('FCI DYEING — WEIGHING TICKET');
    await userEvent.keyboard('{F1}');
    expect(ticketNet.reprintTicket).toHaveBeenCalledWith('session-1');
  });
});
