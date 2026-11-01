// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OrgatexBatch, OrgatexRecipe } from '../../../src/shared/contracts/orgatex';
import { ApiError } from '../../../src/client/net/http';
import * as orgatex from '../../../src/client/net/orgatex';
import * as scanner from '../../../src/client/net/scanner';
import { BatchSelectionScreen } from '../../../src/client/features/batch-selection/BatchSelectionScreen';

vi.mock('../../../src/client/net/orgatex');
vi.mock('../../../src/client/net/scanner');

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
const QUEUED: OrgatexBatch = {
  ...RELEASED,
  batchId: 'B-24188',
  status: 'QUEUED',
  orderRef: 'SO-9932',
};
const RECIPE: OrgatexRecipe = {
  batchId: 'B-24187',
  recipeId: 'R-24187',
  shadeCode: 'Teal 4C',
  components: [],
};

function mockScannerIdle() {
  vi.mocked(scanner.getScanEvents).mockResolvedValue({ events: [], lastSeq: 0 });
}

describe('BatchSelectionScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScannerIdle();
  });

  it('renders the queue from the API with status tags', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([RELEASED, QUEUED]);
    render(<BatchSelectionScreen onSelected={vi.fn()} />);

    expect(await screen.findByText('B-24187')).toBeInTheDocument();
    expect(screen.getByText('SO-9931')).toBeInTheDocument();
    expect(screen.getByText('RELEASED')).toBeInTheDocument();
    expect(screen.getByText('QUEUED')).toBeInTheDocument();
  });

  it('shows the empty state when no batches are released', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([]);
    render(<BatchSelectionScreen onSelected={vi.fn()} />);
    expect(await screen.findByText(/No batches released/)).toBeInTheDocument();
  });

  it('selects a released batch: reads batch then recipe, in order', async () => {
    const calls: string[] = [];
    vi.mocked(orgatex.listBatches).mockResolvedValue([RELEASED]);
    vi.mocked(orgatex.getBatch).mockImplementation((id) => {
      calls.push(`batch:${id}`);
      return Promise.resolve(RELEASED);
    });
    vi.mocked(orgatex.getRecipe).mockImplementation((id) => {
      calls.push(`recipe:${id}`);
      return Promise.resolve(RECIPE);
    });
    const onSelected = vi.fn();
    render(<BatchSelectionScreen onSelected={onSelected} />);

    const row = await screen.findByRole('row', { name: 'Select batch B-24187' });
    await userEvent.click(row);

    await waitFor(() => {
      expect(onSelected).toHaveBeenCalledWith({ batch: RELEASED, recipe: RECIPE });
    });
    expect(calls).toEqual(['batch:B-24187', 'recipe:B-24187']);
  });

  it('shows the refusal reason for a non-released batch and does not fetch its recipe', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([QUEUED]);
    vi.mocked(orgatex.getBatch).mockResolvedValue(QUEUED);
    const onSelected = vi.fn();
    render(<BatchSelectionScreen onSelected={onSelected} />);

    await userEvent.click(await screen.findByRole('row', { name: 'Select batch B-24188' }));

    expect(
      await screen.findByText('Batch B-24188 not released by OrgaTEX (status QUEUED)'),
    ).toBeInTheDocument();
    expect(orgatex.getRecipe).not.toHaveBeenCalled();
    expect(onSelected).not.toHaveBeenCalled();
  });

  it('shows "OrgaTEX unavailable" with Retry, which reloads the queue', async () => {
    vi.mocked(orgatex.listBatches)
      .mockRejectedValueOnce(new ApiError(503, 'ORGATEX_UNAVAILABLE', 'OrgaTEX is unavailable'))
      .mockResolvedValueOnce([RELEASED]);
    render(<BatchSelectionScreen onSelected={vi.fn()} />);

    expect(await screen.findByText('OrgaTEX unavailable — Retry')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('B-24187')).toBeInTheDocument();
  });

  // Keyboard-wedge exercises the same `selection.select(code)` path a scanner-feed event would;
  // the scanner feed's own polling/sequencing is covered by use-scan-input.test.tsx.
  it('a keyboard-wedge scan of an unknown batch code shows "not found"', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([RELEASED]);
    vi.mocked(orgatex.getBatch).mockRejectedValue(
      new ApiError(404, 'BATCH_NOT_FOUND', 'Batch B-99999 not found'),
    );
    render(<BatchSelectionScreen onSelected={vi.fn()} />);
    await screen.findByText('B-24187');

    await userEvent.keyboard('B-99999{Enter}');

    expect(await screen.findByText('Batch B-99999 not found')).toBeInTheDocument();
  });

  it('a keyboard-wedge scan of a dyestuff barcode shows it is not a batch card', async () => {
    vi.mocked(orgatex.listBatches).mockResolvedValue([RELEASED]);
    render(<BatchSelectionScreen onSelected={vi.fn()} />);
    await screen.findByText('B-24187');

    await userEvent.keyboard('DYE-4471{Enter}');

    expect(await screen.findByText('DYE-4471 is not a batch card')).toBeInTheDocument();
    expect(orgatex.getBatch).not.toHaveBeenCalled();
  });
});
