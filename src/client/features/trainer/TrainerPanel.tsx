import type { ComponentView } from '../../../shared/contracts/weighing';
import { Key } from '../../components/Key';
import { useTrainerPanel } from './use-trainer-panel';

/**
 * Trainer simulator panel (story 009), visibly separate from the station screen. Printer
 * controls are omitted — unit 005 doesn't exist yet (added once bolt 010/011 land).
 */
export function TrainerPanel({
  activeComponent,
  onAfterReset,
}: {
  activeComponent: ComponentView | null;
  onAfterReset: () => void;
}) {
  const panel = useTrainerPanel(activeComponent, onAfterReset);

  return (
    <div className="wms-trainer" aria-label="Trainer simulator panel">
      <div className="wms-trainer-section">
        <span className="wms-trainer-label">Weighing</span>
        <Key disabled={panel.pending || !activeComponent} onClick={panel.simulateDispense}>
          ▶ Simulate dispense
        </Key>
        <Key disabled={panel.pending || !activeComponent} onClick={panel.simulateOvershoot}>
          ▶ Simulate overshoot
        </Key>
        <input
          type="number"
          step="0.001"
          placeholder="Weight (g)"
          value={panel.weightInput}
          onChange={(e) => {
            panel.setWeightInput(e.target.value);
          }}
          aria-label="Set weight in grams"
        />
        <Key
          disabled={panel.pending || !activeComponent?.scaleId}
          onClick={() => {
            if (activeComponent?.scaleId) {
              panel.setWeight(
                activeComponent.scaleId as 'scale-3kg' | 'scale-32kg',
                panel.weightInput,
              );
            }
          }}
        >
          Set weight
        </Key>
      </div>

      <div className="wms-trainer-section">
        <span className="wms-trainer-label">Devices</span>
        {(['scale-3kg', 'scale-32kg'] as const).map((scaleId) => (
          <span key={scaleId} className="wms-trainer-device">
            {scaleId}
            <Key
              disabled={panel.pending}
              onClick={() => {
                panel.setScaleOnline(scaleId, true);
              }}
            >
              ON
            </Key>
            <Key
              disabled={panel.pending}
              onClick={() => {
                panel.setScaleOnline(scaleId, false);
              }}
            >
              OFF
            </Key>
          </span>
        ))}
        <span className="wms-trainer-device">
          scanner
          <Key
            disabled={panel.pending}
            onClick={() => {
              panel.setScannerOnline(true);
            }}
          >
            ON
          </Key>
          <Key
            disabled={panel.pending}
            onClick={() => {
              panel.setScannerOnline(false);
            }}
          >
            OFF
          </Key>
        </span>
        <span className="wms-trainer-device">
          OrgaTEX
          <Key
            disabled={panel.pending}
            onClick={() => {
              panel.setOrgatexOnline(true);
            }}
          >
            ON
          </Key>
          <Key
            disabled={panel.pending}
            onClick={() => {
              panel.setOrgatexOnline(false);
            }}
          >
            OFF
          </Key>
        </span>
      </div>

      <div className="wms-trainer-section">
        <span className="wms-trainer-label">Scanner</span>
        <input
          type="text"
          placeholder="Code to scan"
          value={panel.scanCode}
          onChange={(e) => {
            panel.setScanCode(e.target.value);
          }}
          aria-label="Code to inject"
        />
        <Key
          disabled={panel.pending}
          onClick={() => {
            panel.inject(panel.scanCode);
            panel.setScanCode('');
          }}
        >
          Inject scan
        </Key>
      </div>

      <div className="wms-trainer-section">
        <Key disabled={panel.pending} onClick={panel.reset}>
          Reset scenario
        </Key>
      </div>
    </div>
  );
}
