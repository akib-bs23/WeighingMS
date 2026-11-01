import type { DeviceAvailability, ScaleStatus } from '../../shared/contracts/devices';
import type { OrgatexLinkStatus } from '../../shared/contracts/orgatex';
import { request } from './http';

/**
 * Status reads for the station's own status strip (FR-28) — never the `/training/*` simulator
 * surface, which exists only for the trainer panel.
 */

export function getScaleStatus(scaleId: string): Promise<ScaleStatus> {
  return request(`/scales/${scaleId}/status`);
}

export function getScannerStatus(): Promise<DeviceAvailability> {
  return request('/scanner/status');
}

export function getPrinterStatus(): Promise<DeviceAvailability> {
  return request('/printer/status');
}

export function getOrgatexStatus(): Promise<OrgatexLinkStatus> {
  return request('/orgatex/status');
}
