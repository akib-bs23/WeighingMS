import type { ScanFeed } from '../../shared/contracts/devices';
import { request } from './http';

export function getScanEvents(sinceSeq: number): Promise<ScanFeed> {
  return request(`/scanner/events?since=${sinceSeq}`);
}
