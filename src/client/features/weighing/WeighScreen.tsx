import { useEffect } from 'react';
import type {
  ComponentView,
  CompletionResult,
  SessionView,
} from '../../../shared/contracts/weighing';
import { classifyReading } from '../../../shared/weighing/reading-safety';
import { toleranceBand, evaluateZone } from '../../../shared/weighing/tolerance';
import { useFunctionKeys } from '../../hooks/use-function-keys';
import { complete } from '../../net/weighing';
import { useScanInput } from '../scan/use-scan-input';
import { messages } from '../../i18n/messages';
import { ComponentHeader } from './ComponentHeader';
import { OverrideDialog } from './OverrideDialog';
import { ProgressBar } from './ProgressBar';
import { ReadoutPanel } from './ReadoutPanel';
import { RecipeRail } from './RecipeRail';
import { StatusLine } from './StatusLine';
import { useLiveWeight, type LiveWeight } from './useLiveWeight';
import { useWeighActions } from './useWeighActions';
import { WeighActions } from './WeighActions';

/** Screen 2 · Weigh (prototype `v-weigh`, re-implemented from the spec). */
export function WeighScreen({
  session,
  shadeCode,
  onSessionUpdate,
  onBatchCompleted,
}: {
  session: SessionView;
  shadeCode: string;
  onSessionUpdate: (session: SessionView) => void;
  onBatchCompleted: (result: CompletionResult) => void;
}) {
  const actions = useWeighActions(session, onSessionUpdate);
  const { active } = actions;
  const live = useLiveWeight(active?.scaleId ?? null, true);
  const allDone =
    session.components.length > 0 && session.components.every((c) => c.state === 'DONE');

  useScanInput(active !== null, actions.scanIdentity);

  // Completing is a one-shot side effect of the session reaching "all done, none active" — the
  // effect body only ever runs the call once per completion because the parent unmounts this
  // screen (switches to Screen 3) right after `onBatchCompleted` fires.
  useEffect(() => {
    if (session.status === 'IN_PROGRESS' && active === null && allDone) {
      void complete(session.sessionId).then(onBatchCompleted);
    }
  }, [session, active, allDone, onBatchCompleted]);

  // A reading the scale itself cannot vouch for (story 006, reused client-side) is never
  // evaluated for tolerance — classification only runs once capacity has loaded (story 007).
  const invalid =
    live.reading !== null &&
    live.reading.netMg !== null &&
    live.capacityMg !== null &&
    classifyReading(live.reading.netMg, live.capacityMg) === 'INVALID';

  const canConfirm =
    active !== null &&
    !live.offline &&
    !invalid &&
    (live.reading?.stable ?? false) &&
    active.identity !== 'MISMATCH' &&
    evaluateZone(live.reading?.netMg ?? 0, toleranceBand(active.targetMg, active.toleranceMg)) ===
      'OK';

  useFunctionKeys({
    enabled: !actions.overrideOpen,
    F1: canConfirm ? actions.confirmActive : undefined,
    F2: active ? actions.retareActive : undefined,
    F4: active ? actions.quitActive : undefined,
  });

  // (Screen 2 has no F3 action — Next batch is Screen 3's own key, story 008.)

  return (
    <div className="wms-stage">
      <RecipeRail session={session} shadeCode={shadeCode} onSelect={actions.selectComponent} />
      <section className="wms-weigh">
        {active ? (
          <ActiveComponent
            active={active}
            live={live}
            invalid={invalid}
            canConfirm={canConfirm}
            actions={actions}
          />
        ) : (
          <div className="wms-info-banner">
            {allDone ? messages.batchCompleting : messages.selectPendingComponent}
          </div>
        )}
      </section>
      {actions.overrideOpen && (
        <OverrideDialog
          busy={actions.busy}
          error={actions.overrideError}
          onSubmit={actions.submitOverride}
          onCancel={actions.cancelOverride}
        />
      )}
    </div>
  );
}

function ActiveComponent({
  active,
  live,
  invalid,
  canConfirm,
  actions,
}: {
  active: ComponentView;
  live: LiveWeight;
  invalid: boolean;
  canConfirm: boolean;
  actions: ReturnType<typeof useWeighActions>;
}) {
  const netMg = live.reading?.netMg ?? 0;
  const band = toleranceBand(active.targetMg, active.toleranceMg);
  const zone = evaluateZone(netMg, band);

  return (
    <>
      <ComponentHeader component={active} />
      <ReadoutPanel
        netMg={netMg}
        targetMg={active.targetMg}
        uom={active.uom}
        zone={zone}
        offline={live.offline}
        invalid={invalid}
      />
      <ProgressBar
        netMg={netMg}
        band={band}
        displayMaxMg={active.displayMaxMg}
        uom={active.uom}
        zone={zone}
      />
      <StatusLine
        zone={zone}
        netMg={netMg}
        band={band}
        uom={active.uom}
        offline={live.offline}
        invalid={invalid}
      />
      <WeighActions
        canConfirm={canConfirm}
        busy={actions.busy}
        onConfirm={actions.confirmActive}
        onRetare={actions.retareActive}
        onQuit={actions.quitActive}
        onOverride={actions.openOverride}
      />
    </>
  );
}
