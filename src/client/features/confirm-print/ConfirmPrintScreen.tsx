import type { BatchSummaryView, SessionView } from '../../../shared/contracts/weighing';
import type { TicketState } from '../../../shared/contracts/ticket';
import { formatQuantity } from '../../../shared/quantity/format-quantity';
import { useFunctionKeys } from '../../hooks/use-function-keys';
import { Key } from '../../components/Key';
import { messages } from '../../i18n/messages';
import { Barcode } from './Barcode';
import { formatElapsed, formatTime } from './format-elapsed';
import { useConfirmPrint } from './use-confirm-print';

/** Screen 3 · Confirm & print (prototype `v-done`, re-implemented from the spec). */
export function ConfirmPrintScreen({
  session,
  summary: initialSummary,
  onNextBatch,
}: {
  session: SessionView;
  summary: BatchSummaryView;
  onNextBatch: () => void;
}) {
  const { summary, ticket, busy, printOrReprint, retryWriteBackNow } = useConfirmPrint(
    session,
    initialSummary,
  );
  const printLabel = ticket?.status === 'PRINTED' ? messages.reprintTicket : messages.printTicket;

  useFunctionKeys({
    enabled: true,
    F1: ticket ? printOrReprint : undefined,
    F3: onNextBatch,
  });

  return (
    <div className="wms-done-stage">
      <div className="wms-done-msg">
        <span className="h">{messages.batchWeighedHeading(session.batchId)}</span>
        <SummaryPanel summary={summary} />
        <div className="wms-actions">
          <Key className="ok" disabled={busy || !ticket} onClick={printOrReprint}>
            {printLabel}
            <span className="fn" aria-hidden="true">
              F1
            </span>
          </Key>
          <Key disabled={busy} onClick={onNextBatch}>
            {messages.nextBatch}
            <span className="fn" aria-hidden="true">
              F3
            </span>
          </Key>
        </div>
      </div>
      <TicketPanel
        summary={summary}
        ticket={ticket}
        busy={busy}
        onRetryWriteBack={retryWriteBackNow}
      />
    </div>
  );
}

function SummaryPanel({ summary }: { summary: BatchSummaryView }) {
  return (
    <div className="summary">
      <Row
        k={messages.componentsWeighedLabel}
        v={`${summary.componentsDone} of ${summary.componentsTotal}`}
      />
      <Row
        k={messages.allWithinToleranceLabel}
        v={summary.allWithinTolerance ? 'YES' : 'NO'}
        good={summary.allWithinTolerance}
      />
      <Row
        k={messages.totalDispensedLabel}
        v={`${formatQuantity(summary.totalDispensedMg, 'kg')} kg`}
      />
      <Row
        k={messages.elapsedLabel}
        v={summary.elapsedMs !== null ? formatElapsed(summary.elapsedMs) : '—'}
      />
      <Row k={messages.operatorLabel} v={summary.operatorName} />
      <Row
        k={messages.writtenToOrgatexLabel}
        v={
          summary.writeBack?.status === 'CONFIRMED' && summary.writeBack.confirmedAt
            ? messages.writeBackConfirmed(formatTime(summary.writeBack.confirmedAt))
            : messages.writeBackPending
        }
        good={summary.writeBack?.status === 'CONFIRMED'}
      />
    </div>
  );
}

function Row({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="r">
      <span className="k">{k}</span>
      <span className={`v${good ? ' good' : ''}`}>{v}</span>
    </div>
  );
}

function TicketPanel({
  summary,
  ticket,
  busy,
  onRetryWriteBack,
}: {
  summary: BatchSummaryView;
  ticket: TicketState | null;
  busy: boolean;
  onRetryWriteBack: () => void;
}) {
  return (
    <div>
      {summary.writeBack?.status === 'PENDING' && (
        <div className="wms-error-banner" role="alert">
          {messages.writtenToOrgatexLabel}: {messages.writeBackPending}
          <Key disabled={busy} onClick={onRetryWriteBack}>
            {messages.retry}
          </Key>
        </div>
      )}
      {!ticket ? (
        <div className="wms-info-banner">{messages.batchCompleting}</div>
      ) : (
        <div className="ticket">
          <div className="c bold">FCI DYEING — WEIGHING TICKET</div>
          <hr />
          BATCH&nbsp;&nbsp;&nbsp;{ticket.ticket.batchId}
          <br />
          ORDER&nbsp;&nbsp;&nbsp;{ticket.ticket.orderRef}
          <br />
          MACHINE&nbsp;{ticket.ticket.machineRef}
          <br />
          SHADE&nbsp;&nbsp;&nbsp;{ticket.ticket.shadeCode}
          <br />
          DATE&nbsp;&nbsp;&nbsp;&nbsp;{ticket.ticket.date}
          <br />
          OPER.&nbsp;&nbsp;&nbsp;{ticket.ticket.operatorName}
          <hr />
          <span className="bold">COMPONENT&nbsp;&nbsp;&nbsp;TGT&nbsp;&nbsp;&nbsp;&nbsp;ACT</span>
          {ticket.ticket.lines.map((line) => (
            <div key={line.name}>
              {line.name}&nbsp;&nbsp;{formatQuantity(line.targetMg, line.uom)}&nbsp;
              {formatQuantity(line.actualMg, line.uom)} {line.uom}
            </div>
          ))}
          <hr />
          <div className="c">{ticket.ticket.toleranceSummary}</div>
          <Barcode value={ticket.ticket.barcodeValue} />
          <div className="c">{ticket.ticket.barcodeValue}</div>
          {ticket.status === 'PENDING' && (
            <div className="wms-error-banner" role="alert">
              {messages.printerUnavailable}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
