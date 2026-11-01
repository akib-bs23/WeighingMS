import { useState } from 'react';
import { Key } from '../../components/Key';

/** Supervisor PIN + mandatory reason (story 005, FR-19). Both fields required. */
export function OverrideDialog({
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  error: string | null;
  onSubmit: (pin: string, reason: string) => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const canSubmit = pin.trim().length > 0 && reason.trim().length > 0 && !busy;

  return (
    <div className="wms-dialog-overlay" role="presentation">
      <div className="wms-dialog" role="dialog" aria-modal="true" aria-label="Supervisor override">
        <h2>Supervisor override</h2>
        <label className="wms-dialog-field">
          <span>Supervisor PIN</span>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
            }}
          />
        </label>
        <label className="wms-dialog-field">
          <span>Reason</span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        </label>
        {error && (
          <div className="wms-dialog-error" role="alert">
            {error}
          </div>
        )}
        <div className="wms-dialog-actions">
          <Key
            className="ok"
            disabled={!canSubmit}
            onClick={() => {
              onSubmit(pin, reason);
            }}
          >
            Authorise
          </Key>
          <Key disabled={busy} onClick={onCancel}>
            Cancel
          </Key>
        </div>
      </div>
    </div>
  );
}
