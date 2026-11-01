/**
 * Operator-facing text, in one place for later translation (NFR-14). English only for this
 * training build (brief A-10).
 */
export const messages = {
  brand: 'WeighingMS',
  scanPrompt: 'Scan a batch card to begin',
  scanHint: 'Or touch a row below.',
  queueReceivedAt: (time: string): string => `Queue received from OrgaTEX at ${time}.`,
  queueEmpty: 'No batches released for this station.',
  queueLoadError: 'OrgaTEX unavailable — Retry',
  retry: 'Retry',
  backToQueue: 'Back to queue',
  batchCompleting: 'Completing batch…',
  selectPendingComponent: 'Select a pending component to continue.',
  notABatchCode: (code: string): string => `${code} is not a batch card`,
  batchWeighedHeading: (batchId: string): string => `Batch ${batchId} weighed`,
  componentsWeighedLabel: 'Components weighed',
  allWithinToleranceLabel: 'All within tolerance',
  totalDispensedLabel: 'Total dispensed',
  elapsedLabel: 'Elapsed',
  operatorLabel: 'Operator',
  writtenToOrgatexLabel: 'Written to OrgaTEX',
  writeBackPending: 'PENDING',
  writeBackConfirmed: (time: string): string => `CONFIRMED ${time}`,
  printTicket: 'Print ticket',
  reprintTicket: 'Reprint',
  nextBatch: 'Next batch',
  printerUnavailable: 'Printer unavailable',
  columns: {
    batch: 'Batch',
    order: 'Order',
    machine: 'Machine',
    fabric: 'Fabric / lot',
    shade: 'Shade',
    components: 'Comp.',
    status: 'Status',
  },
} as const;
