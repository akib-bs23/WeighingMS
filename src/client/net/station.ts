import type { StationContext } from '../../shared/contracts/station';
import { request } from './http';

export function getStation(): Promise<StationContext> {
  return request('/station');
}
