import type { BatchSelection } from '../../../shared/contracts/station';
import { Key } from '../../components/Key';
import { messages } from '../../i18n/messages';
import { useScanInput } from '../scan/use-scan-input';
import { QueueTable } from './QueueTable';
import { useBatchQueue } from './use-batch-queue';
import { useBatchSelection } from './use-batch-selection';

/**
 * Screen 1 · Select batch (prototype view `v-queue`, re-implemented from the spec). All data
 * comes from the API; no batch is ever embedded in this component (workbook Rule 5).
 */
export function BatchSelectionScreen({ onSelected }: { onSelected: (s: BatchSelection) => void }) {
  const queue = useBatchQueue();
  const selection = useBatchSelection(onSelected);

  useScanInput(true, selection.select);

  return (
    <div className="wms-queue">
      <div className="wms-scan-prompt">
        <div className="wms-beam" aria-hidden="true" />
        <div>
          <div className="big">{messages.scanPrompt}</div>
          <div className="sm">
            {messages.scanHint} {queue.receivedAt && messages.queueReceivedAt(queue.receivedAt)}
          </div>
        </div>
      </div>

      {selection.reason && (
        <div className="wms-error-banner" role="alert">
          <span>{selection.reason}</span>
          <Key onClick={selection.dismiss}>Dismiss</Key>
        </div>
      )}

      {queue.error && (
        <div className="wms-error-banner" role="alert">
          <span>{messages.queueLoadError}</span>
          <Key onClick={queue.retry}>{messages.retry}</Key>
        </div>
      )}

      {!queue.error && queue.batches && queue.batches.length === 0 && (
        <div className="wms-info-banner">{messages.queueEmpty}</div>
      )}

      {!queue.error && queue.batches && queue.batches.length > 0 && (
        <QueueTable
          batches={queue.batches}
          disabled={selection.pending}
          onSelect={selection.select}
        />
      )}
    </div>
  );
}
