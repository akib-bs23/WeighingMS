import type { OrgatexBatch } from '../../../shared/contracts/orgatex';
import { messages } from '../../i18n/messages';

/**
 * Batch queue rendered as an accessible grid (not a real `<table>`, so each row can be one
 * clickable `<button>` — a button cannot legally contain table markup).
 */
export function QueueTable({
  batches,
  disabled,
  onSelect,
}: {
  batches: OrgatexBatch[];
  disabled: boolean;
  onSelect: (batchId: string) => void;
}) {
  const c = messages.columns;
  return (
    <div className="wms-queue-table" role="table" aria-label="Batch queue">
      <div role="row" style={{ display: 'contents' }}>
        {[c.batch, c.order, c.machine, c.fabric, c.shade, c.components, c.status].map((label) => (
          <div key={label} role="columnheader" className="wms-cell wms-head">
            {label}
          </div>
        ))}
      </div>
      {batches.map((batch) => (
        <QueueRow key={batch.batchId} batch={batch} disabled={disabled} onSelect={onSelect} />
      ))}
    </div>
  );
}

function QueueRow({
  batch,
  disabled,
  onSelect,
}: {
  batch: OrgatexBatch;
  disabled: boolean;
  onSelect: (batchId: string) => void;
}) {
  return (
    <button
      type="button"
      role="row"
      className="wms-queue-row"
      disabled={disabled}
      onClick={() => {
        onSelect(batch.batchId);
      }}
      aria-label={`Select batch ${batch.batchId}`}
    >
      <span role="cell" className="wms-cell">
        {batch.batchId}
      </span>
      <span role="cell" className="wms-cell">
        {batch.orderRef}
      </span>
      <span role="cell" className="wms-cell">
        {batch.machineRef}
      </span>
      <span role="cell" className="wms-cell">
        {batch.fabricDesc} · {batch.fabricWeightKg} kg
      </span>
      <span role="cell" className="wms-cell">
        {batch.shadeCode}
      </span>
      <span role="cell" className="wms-cell">
        {batch.componentCount}
      </span>
      <span role="cell" className="wms-cell">
        <span className={`wms-tag ${batch.status === 'RELEASED' ? 'released' : ''}`}>
          {batch.status}
        </span>
      </span>
    </button>
  );
}
