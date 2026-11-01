import type {
  ScaleInfo,
  ScaleStatus,
  TareResult,
  WeightReading,
} from '../../../shared/contracts/devices';

/**
 * The only way WeighingMS talks to scale indicators. Bound to the Dummy adapter for training;
 * a serial/Ethernet driver would implement the same interface (brief IR-10…IR-14).
 *
 * Implementations throw `UnavailableError('SCALE_UNAVAILABLE')` when the indicator does not
 * respond and `NotFoundError('SCALE_NOT_FOUND')` for unknown scales.
 */
export interface ScalePort {
  listScales(): Promise<ScaleInfo[]>;
  getStatus(scaleId: string): Promise<ScaleStatus>;
  readWeight(scaleId: string): Promise<WeightReading>;
  tare(scaleId: string): Promise<TareResult>;
}

export const SCALE_PORT = Symbol('SCALE_PORT');
