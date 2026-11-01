/**
 * Dummy OrgaTEX training contract.
 *
 * These shapes are the training-time contract served by the Dummy OrgaTEX. They make no claim
 * about the real OrgaTEX/SETEX interface (brief A-01, A-02; OQ-01, OQ-02).
 */

export type Uom = 'g' | 'kg';

export const BATCH_STATUSES = ['QUEUED', 'RELEASED', 'WEIGHING', 'WEIGHED', 'CANCELLED'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const DYESTUFF_TYPES = ['DYE', 'AUXILIARY', 'SALT', 'ALKALI'] as const;
export type DyestuffType = (typeof DYESTUFF_TYPES)[number];

export interface OrgatexBatch {
  batchId: string;
  orderRef: string;
  machineRef: string;
  fabricDesc: string;
  fabricWeightKg: number;
  shadeCode: string;
  componentCount: number;
  status: BatchStatus;
  recipeId: string;
}

export interface OrgatexDyestuff {
  code: string;
  name: string;
  type: DyestuffType;
  colourHex: string;
  barcode: string;
}

/** All quantities are integer milligrams; `uom` is the display unit for the component. */
export interface OrgatexRecipeComponent {
  componentId: string;
  sequence: number;
  dyestuff: OrgatexDyestuff;
  targetMg: number;
  uom: Uom;
  toleranceMg: number;
  displayMaxMg: number;
  lotId: string;
  containerId: string;
}

export interface OrgatexRecipe {
  batchId: string;
  recipeId: string;
  shadeCode: string;
  components: OrgatexRecipeComponent[];
}

export const WEIGHING_RESULTS = ['IN_TOLERANCE', 'OVERRIDDEN'] as const;
export type WeighingResult = (typeof WEIGHING_RESULTS)[number];

/** Actual consumption of one recipe component, posted to OrgaTEX on batch completion. */
export interface ConsumptionLine {
  componentId: string;
  dyestuffCode: string;
  lotId: string;
  targetMg: number;
  actualMg: number;
  uom: Uom;
  scaleId: string;
  result: WeighingResult;
}

/** Body of `POST /api/batches/:batchId/consumption`; the idempotency key travels as a header. */
export interface ConsumptionRequest {
  stationId: string;
  operatorId: string;
  completedAt: string;
  lines: ConsumptionLine[];
}

export interface ConsumptionReceipt {
  consumptionId: string;
  batchId: string;
  idempotencyKey: string;
  confirmedAt: string;
  lineCount: number;
}

/** A consumption record as stored by the Dummy OrgaTEX (training inspection). */
export interface StoredConsumption extends ConsumptionReceipt, ConsumptionRequest {}

/** OrgaTEX's link state for the station's own status strip (FR-28) — not a training endpoint. */
export interface OrgatexLinkStatus {
  online: boolean;
  lastSuccessfulContactAt: string | null;
}
