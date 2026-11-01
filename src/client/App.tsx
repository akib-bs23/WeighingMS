import { useEffect, useState } from 'react';
import type { BatchSelection, StationContext } from '../shared/contracts/station';
import type { BatchSummaryView, CompletionResult, SessionView } from '../shared/contracts/weighing';
import { ApiError } from './net/http';
import { getStation } from './net/station';
import { getSummary, startOrResumeSession } from './net/weighing';
import { StationFrame } from './components/StationFrame';
import { StatusStrip } from './components/StatusStrip';
import { TopBar, type BatchCrumb } from './components/TopBar';
import { BatchSelectionScreen } from './features/batch-selection/BatchSelectionScreen';
import { ConfirmPrintScreen } from './features/confirm-print/ConfirmPrintScreen';
import { TrainerPanel } from './features/trainer/TrainerPanel';
import { WeighScreen } from './features/weighing/WeighScreen';

interface WeighView {
  name: 'weigh';
  session: SessionView;
  crumb: BatchCrumb;
  shadeCode: string;
}
interface DoneView {
  name: 'done';
  session: SessionView;
  crumb: BatchCrumb;
  summary: BatchSummaryView;
}
type View = { name: 'queue' } | WeighView | DoneView;

export function App() {
  const [station, setStation] = useState<StationContext | null>(null);
  const [stationError, setStationError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ name: 'queue' });

  useEffect(() => {
    getStation()
      .then(setStation)
      .catch((e: unknown) => {
        setStationError(e instanceof ApiError ? e.message : 'Station service unreachable');
      });
  }, []);

  const handleSelected = (selection: BatchSelection): void => {
    const crumb: BatchCrumb = {
      batchId: selection.batch.batchId,
      orderRef: selection.batch.orderRef,
      machineRef: selection.batch.machineRef,
    };
    startOrResumeSession(selection.batch.batchId)
      .then((session) => {
        // NFR-6: resuming an already-completed session (e.g. after a reload) lands back on
        // Screen 3, not briefly through Screen 2 — resume means wherever the session actually is.
        if (session.status === 'COMPLETED') {
          return getSummary(session.sessionId).then((summary) => {
            setView({ name: 'done', session, crumb, summary });
          });
        }
        setView({ name: 'weigh', session, shadeCode: selection.recipe.shadeCode, crumb });
        return undefined;
      })
      .catch(() => {
        // Session start failed (e.g. OrgaTEX went unavailable between selection and start):
        // staying on the queue, which will show the batch as selectable again, is the safe state.
      });
  };

  const handleSessionUpdate = (session: SessionView): void => {
    setView((v) => (v.name === 'weigh' ? { ...v, session } : v));
  };

  const handleBatchCompleted = (result: CompletionResult): void => {
    setView((v) =>
      v.name === 'weigh'
        ? { name: 'done', session: result.session, crumb: v.crumb, summary: result.summary }
        : v,
    );
  };

  const handleReset = (): void => {
    setView({ name: 'queue' });
  };

  if (stationError) {
    return (
      <StationFrame>
        <div />
        <div className="wms-queue">
          <div className="wms-error-banner" role="alert">
            {stationError}
          </div>
        </div>
        <div />
      </StationFrame>
    );
  }

  const activeComponent =
    view.name === 'weigh'
      ? (view.session.components.find((c) => c.componentId === view.session.activeComponentId) ??
        null)
      : null;

  return (
    <StationFrame>
      <TopBar station={station} crumb={view.name !== 'queue' ? view.crumb : null} />
      {view.name === 'queue' && <BatchSelectionScreen onSelected={handleSelected} />}
      {view.name === 'weigh' && (
        <WeighScreen
          session={view.session}
          shadeCode={view.shadeCode}
          onSessionUpdate={handleSessionUpdate}
          onBatchCompleted={handleBatchCompleted}
        />
      )}
      {view.name === 'done' && (
        <ConfirmPrintScreen
          session={view.session}
          summary={view.summary}
          onNextBatch={handleReset}
        />
      )}
      <TrainerPanel activeComponent={activeComponent} onAfterReset={handleReset} />
      <StatusStrip />
    </StationFrame>
  );
}
