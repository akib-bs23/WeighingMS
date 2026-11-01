// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/client/App';
import { ApiError } from '../../src/client/net/http';
import * as orgatex from '../../src/client/net/orgatex';
import * as scanner from '../../src/client/net/scanner';
import * as station from '../../src/client/net/station';
import * as ticket from '../../src/client/net/ticket';
import * as training from '../../src/client/net/training';
import * as weighing from '../../src/client/net/weighing';
import type { OrgatexBatch, OrgatexRecipe } from '../../src/shared/contracts/orgatex';
import type { BatchSummaryView, SessionView } from '../../src/shared/contracts/weighing';

vi.mock('../../src/client/net/orgatex');
vi.mock('../../src/client/net/scanner');
vi.mock('../../src/client/net/station');
vi.mock('../../src/client/net/weighing');
vi.mock('../../src/client/net/training');
vi.mock('../../src/client/net/ticket');
vi.mock('../../src/client/net/write-back');

const STATION = {
  stationId: 'STN-01',
  name: 'Weighing Station 01',
  operator: { operatorId: 'OP-001', name: 'R. Karim', shift: 'Shift A' },
};
const RELEASED: OrgatexBatch = {
  batchId: 'B-24187',
  orderRef: 'SO-9931',
  machineRef: 'JET-04',
  fabricDesc: '100% CTN knit',
  fabricWeightKg: 480,
  shadeCode: 'Teal 4C',
  componentCount: 5,
  status: 'RELEASED',
  recipeId: 'R-24187',
};
const RECIPE: OrgatexRecipe = {
  batchId: 'B-24187',
  recipeId: 'R-24187',
  shadeCode: 'Teal 4C',
  components: [],
};
const SESSION: SessionView = {
  sessionId: 'session-1',
  batchId: 'B-24187',
  orderRef: 'SO-9931',
  machineRef: 'JET-04',
  shadeCode: 'Teal 4C',
  stationId: 'STN-01',
  operatorId: 'OP-001',
  status: 'IN_PROGRESS',
  activeComponentId: null,
  startedAt: '2026-10-30T00:00:00.000Z',
  completedAt: null,
  components: [],
};
const COMPLETED_SESSION: SessionView = {
  ...SESSION,
  status: 'COMPLETED',
  completedAt: '2026-10-30T00:06:41.000Z',
};
const SUMMARY: BatchSummaryView = {
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
};

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(scanner.getScanEvents).mockResolvedValue({ events: [], lastSeq: 0 });
    vi.mocked(station.getStation).mockResolvedValue(STATION);
  });

  it('shows the brand and operator chip from the station API', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByText('WeighingMS')).toBeInTheDocument();
    expect(await screen.findByText('STN-01')).toBeInTheDocument();
    expect(await screen.findByText('R. Karim')).toBeInTheDocument();
    expect(screen.getByText('Shift A')).toBeInTheDocument();
  });

  it('shows a full-screen error when the station context cannot be loaded', async () => {
    vi.mocked(station.getStation).mockRejectedValue(
      new ApiError(503, 'STATION_UNAVAILABLE', 'Station service unreachable'),
    );
    vi.mocked(orgatex.listBatches).mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByText('Station service unreachable')).toBeInTheDocument();
  });

  it('shows the batch crumb after selecting a batch, with no crumb on the queue screen', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([RELEASED]);
    vi.mocked(orgatex.getBatch).mockResolvedValue(RELEASED);
    vi.mocked(orgatex.getRecipe).mockResolvedValue(RECIPE);
    vi.mocked(weighing.startOrResumeSession).mockResolvedValue(SESSION);
    render(<App />);

    await screen.findByText('B-24187');
    expect(screen.queryByLabelText('batch crumb')).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole('row', { name: 'Select batch B-24187' }));

    await waitFor(() => expect(screen.getByLabelText('batch crumb')).toHaveTextContent('JET-04'));
    expect(screen.getByLabelText('batch crumb')).toHaveTextContent('SO-9931');
    expect(weighing.startOrResumeSession).toHaveBeenCalledWith('B-24187');
  });

  it('returns to the queue after a trainer reset', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([RELEASED]);
    vi.mocked(orgatex.getBatch).mockResolvedValue(RELEASED);
    vi.mocked(orgatex.getRecipe).mockResolvedValue(RECIPE);
    vi.mocked(weighing.startOrResumeSession).mockResolvedValue(SESSION);
    render(<App />);

    await userEvent.click(await screen.findByRole('row', { name: 'Select batch B-24187' }));
    await waitFor(() => expect(screen.getByLabelText('batch crumb')).toBeInTheDocument());

    vi.mocked(training.resetScenario).mockResolvedValue({
      reset: [],
      resetAt: '2026-10-30T00:00:00.000Z',
    });

    await userEvent.click(screen.getByRole('button', { name: 'Reset scenario' }));

    await waitFor(() => expect(screen.queryByLabelText('batch crumb')).not.toBeInTheDocument());
    expect(await screen.findByText('B-24187')).toBeInTheDocument();
  });

  it('resuming an already-completed session goes straight to Screen 3 (NFR-6)', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([RELEASED]);
    vi.mocked(orgatex.getBatch).mockResolvedValue(RELEASED);
    vi.mocked(orgatex.getRecipe).mockResolvedValue(RECIPE);
    vi.mocked(weighing.startOrResumeSession).mockResolvedValue(COMPLETED_SESSION);
    vi.mocked(weighing.getSummary).mockResolvedValue(SUMMARY);
    vi.mocked(ticket.submitTicket).mockReturnValue(new Promise(() => {}));
    render(<App />);

    await userEvent.click(await screen.findByRole('row', { name: 'Select batch B-24187' }));

    expect(await screen.findByText('Batch B-24187 weighed')).toBeInTheDocument();
    expect(weighing.getSummary).toHaveBeenCalledWith('session-1');
  });

  it('switches to Screen 3 when WeighScreen reports the batch completed', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([RELEASED]);
    vi.mocked(orgatex.getBatch).mockResolvedValue(RELEASED);
    vi.mocked(orgatex.getRecipe).mockResolvedValue(RECIPE);
    // All components already DONE, none active — WeighScreen's own effect calls complete().
    const allDoneSession: SessionView = {
      ...SESSION,
      activeComponentId: null,
      components: [
        {
          componentId: 'RC-1',
          sequence: 1,
          state: 'DONE',
          dyestuff: {
            code: 'D-001',
            name: 'Blue RSPL',
            type: 'DYE',
            colourHex: '#000',
            barcode: 'D-001',
          },
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
        },
      ],
    };
    vi.mocked(weighing.startOrResumeSession).mockResolvedValue(allDoneSession);
    vi.mocked(weighing.complete).mockResolvedValue({
      session: COMPLETED_SESSION,
      summary: SUMMARY,
    });
    vi.mocked(ticket.submitTicket).mockReturnValue(new Promise(() => {}));
    render(<App />);

    await userEvent.click(await screen.findByRole('row', { name: 'Select batch B-24187' }));

    expect(await screen.findByText('Batch B-24187 weighed')).toBeInTheDocument();
    expect(weighing.complete).toHaveBeenCalledWith('session-1');
  });
});
