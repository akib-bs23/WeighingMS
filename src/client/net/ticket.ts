import type { TicketState } from '../../shared/contracts/ticket';
import { request } from './http';

export function getTicket(sessionId: string): Promise<TicketState> {
  return request(`/sessions/${sessionId}/ticket`);
}

export function submitTicket(sessionId: string): Promise<TicketState> {
  return request(`/sessions/${sessionId}/ticket`, { method: 'POST' });
}

export function retryTicket(sessionId: string): Promise<TicketState> {
  return request(`/sessions/${sessionId}/ticket/retry`, { method: 'POST' });
}

export function reprintTicket(sessionId: string): Promise<TicketState> {
  return request(`/sessions/${sessionId}/ticket/reprint`, { method: 'POST' });
}
