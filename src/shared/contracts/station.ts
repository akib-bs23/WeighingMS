import type { OrgatexBatch, OrgatexRecipe } from './orgatex';

/** A batch the station may weigh, with its recipe (`POST /api/station/batch-selection`). */
export interface BatchSelection {
  batch: OrgatexBatch;
  recipe: OrgatexRecipe;
}

export interface StationOperator {
  operatorId: string;
  name: string;
  shift: string;
}

/** The station and its signed-on operator (TD-6: fixed training operator). */
export interface StationContext {
  stationId: string;
  name: string;
  operator: StationOperator;
}
