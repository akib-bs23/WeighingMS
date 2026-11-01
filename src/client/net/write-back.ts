import type { WriteBackState } from '../../shared/contracts/write-back';
import { request } from './http';

export function getWriteBack(sessionId: string): Promise<WriteBackState> {
  return request(`/sessions/${sessionId}/write-back`);
}

export function retryWriteBack(sessionId: string): Promise<WriteBackState> {
  return request(`/sessions/${sessionId}/write-back/retry`, { method: 'POST' });
}
