export type ComponentState = 'PENDING' | 'ACTIVE' | 'DONE';

export interface ProgressibleComponent {
  componentId: string;
  sequence: number;
  state: ComponentState;
}

/**
 * The next component to activate after a confirmation: always the first **pending** component by
 * recipe sequence, even if the operator jumped ahead and confirmed a later one out of order
 * (story 011 edge case; matches the prototype's own progression rule).
 */
export function nextActive<T extends ProgressibleComponent>(components: T[]): T | null {
  const pending = components.filter((c) => c.state === 'PENDING');
  if (pending.length === 0) return null;
  return pending.reduce((first, c) => (c.sequence < first.sequence ? c : first));
}
