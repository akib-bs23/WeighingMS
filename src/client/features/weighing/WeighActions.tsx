import { Key } from '../../components/Key';

/** Action row (prototype L556–L561), fully wired (story 005). */
export function WeighActions({
  canConfirm,
  busy,
  onConfirm,
  onRetare,
  onQuit,
  onOverride,
}: {
  canConfirm: boolean;
  busy: boolean;
  onConfirm: () => void;
  onRetare: () => void;
  onQuit: () => void;
  onOverride: () => void;
}) {
  return (
    <div className="wms-actions">
      <Key className="ok" disabled={!canConfirm || busy} onClick={onConfirm}>
        OK · Confirm
        <span className="fn" aria-hidden="true">
          F1
        </span>
      </Key>
      <Key disabled={busy} onClick={onRetare}>
        Re-tare
        <span className="fn" aria-hidden="true">
          F2
        </span>
      </Key>
      <Key disabled={busy} onClick={onQuit}>
        Quit
        <span className="fn" aria-hidden="true">
          F4
        </span>
      </Key>
      <Key disabled={busy} onClick={onOverride} style={{ marginLeft: 'auto' }}>
        Supervisor override
      </Key>
    </div>
  );
}
