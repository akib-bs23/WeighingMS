import { useState } from 'react';
import type { ComponentView, ConfirmResult, SessionView } from '../../../shared/contracts/weighing';
import { ApiError } from '../../net/http';
import {
  activateComponent,
  authoriseOverride,
  confirm,
  quit,
  retare,
  verifyIdentity,
} from '../../net/weighing';

/**
 * Screen 2's action/dialog state (story 005) — grown past what fit inline in `WeighScreen.tsx`
 * once Quit and the override dialog joined OK/Re-tare, same reasoning bolt 005 used for
 * `use-batch-queue`.
 */
export function useWeighActions(session: SessionView, onSessionUpdate: (s: SessionView) => void) {
  const [busy, setBusy] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);

  const active: ComponentView | null =
    session.components.find((c) => c.componentId === session.activeComponentId) ?? null;

  const run = (promise: Promise<SessionView>): void => {
    setBusy(true);
    void promise.then(onSessionUpdate).finally(() => {
      setBusy(false);
    });
  };

  const selectComponent = (componentId: string): void => {
    run(activateComponent(session.sessionId, componentId));
  };

  const confirmActive = (): void => {
    setBusy(true);
    void confirm(session.sessionId)
      .then((result: ConfirmResult) => {
        onSessionUpdate(result.session);
      })
      .catch(() => {
        // Out-of-tolerance/unstable/mismatch: the next poll reflects the unchanged state; a
        // dedicated inline message for confirm's own refusal reasons is this bolt's Screen 2
        // status line (unchanged) plus the identity indicator — no separate error surface needed.
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const retareActive = (): void => {
    run(retare(session.sessionId));
  };

  const quitActive = (): void => {
    setOverrideOpen(false);
    run(quit(session.sessionId));
  };

  const scanIdentity = (code: string): void => {
    if (!active) return;
    void verifyIdentity(session.sessionId, code).then(onSessionUpdate);
  };

  const openOverride = (): void => {
    setOverrideError(null);
    setOverrideOpen(true);
  };

  const cancelOverride = (): void => {
    setOverrideOpen(false);
  };

  const submitOverride = (pin: string, reason: string): void => {
    setBusy(true);
    setOverrideError(null);
    authoriseOverride(session.sessionId, pin, reason)
      .then((result) => {
        onSessionUpdate(result.session);
        setOverrideOpen(false);
      })
      .catch((e: unknown) => {
        setOverrideError(e instanceof ApiError ? e.message : 'Override failed');
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return {
    active,
    busy,
    overrideOpen,
    overrideError,
    selectComponent,
    confirmActive,
    retareActive,
    quitActive,
    scanIdentity,
    openOverride,
    cancelOverride,
    submitOverride,
  };
}
