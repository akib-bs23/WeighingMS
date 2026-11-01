import type {
  BatchSummaryView,
  CompletionResult,
  ConfirmResult,
  SessionView,
} from '../../shared/contracts/weighing';
import { request } from './http';

export function startOrResumeSession(batchId: string): Promise<SessionView> {
  return request('/sessions', { method: 'POST', body: JSON.stringify({ batchId }) });
}

export function activateComponent(sessionId: string, componentId: string): Promise<SessionView> {
  return request(`/sessions/${sessionId}/components/${componentId}/activate`, { method: 'POST' });
}

export function retare(sessionId: string): Promise<SessionView> {
  return request(`/sessions/${sessionId}/retare`, { method: 'POST' });
}

export function confirm(sessionId: string): Promise<ConfirmResult> {
  return request(`/sessions/${sessionId}/confirm`, { method: 'POST' });
}

export function verifyIdentity(sessionId: string, code: string): Promise<SessionView> {
  return request(`/sessions/${sessionId}/identity`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function authoriseOverride(
  sessionId: string,
  pin: string,
  reason: string,
): Promise<ConfirmResult> {
  return request(`/sessions/${sessionId}/override`, {
    method: 'POST',
    body: JSON.stringify({ pin, reason }),
  });
}

export function quit(sessionId: string): Promise<SessionView> {
  return request(`/sessions/${sessionId}/quit`, { method: 'POST' });
}

export function complete(sessionId: string): Promise<CompletionResult> {
  return request(`/sessions/${sessionId}/complete`, { method: 'POST' });
}

export function getSummary(sessionId: string): Promise<BatchSummaryView> {
  return request(`/sessions/${sessionId}/summary`);
}
