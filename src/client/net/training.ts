import type {
  DeviceAvailability,
  ScaleReadingError,
  ScanEvent,
  WeightReading,
} from '../../shared/contracts/devices';
import { request } from './http';

/**
 * Training simulator calls (trainer panel only — never used by the station screens). Request
 * shapes mirror the server's DTOs (`scale-training.controller.ts` et al.).
 */

export function setScaleWeight(scaleId: string, netMg: number): Promise<WeightReading> {
  return request(`/training/scales/${scaleId}/weight`, {
    method: 'POST',
    body: JSON.stringify({ netMg }),
  });
}

export function setScaleFault(scaleId: string, fault: ScaleReadingError): Promise<WeightReading> {
  return request(`/training/scales/${scaleId}/weight`, {
    method: 'POST',
    body: JSON.stringify({ fault }),
  });
}

export function rampScale(
  scaleId: string,
  toMg: number,
  durationMs?: number,
): Promise<WeightReading> {
  return request(`/training/scales/${scaleId}/ramp`, {
    method: 'POST',
    body: JSON.stringify({ toMg, durationMs }),
  });
}

export function setScaleOnline(scaleId: string, online: boolean): Promise<unknown> {
  return request(`/training/scales/${scaleId}`, {
    method: 'PUT',
    body: JSON.stringify({ online }),
  });
}

export function setScannerOnline(online: boolean): Promise<DeviceAvailability> {
  return request('/training/scanner', { method: 'PUT', body: JSON.stringify({ online }) });
}

export function injectScan(code: string): Promise<ScanEvent> {
  return request('/training/scanner/scans', { method: 'POST', body: JSON.stringify({ code }) });
}

export function setOrgatexOnline(online: boolean): Promise<unknown> {
  return request('/training/orgatex', { method: 'PUT', body: JSON.stringify({ online }) });
}

export function resetScenario(): Promise<{ reset: string[]; resetAt: string }> {
  return request('/training/reset', { method: 'POST' });
}
