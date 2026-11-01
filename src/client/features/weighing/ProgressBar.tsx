import type { Uom } from '../../../shared/contracts/orgatex';
import { formatQuantity } from '../../../shared/quantity/format-quantity';
import type { ToleranceBand, Zone } from '../../../shared/weighing/tolerance';

/**
 * Progress bar with the tolerance band and target line (prototype L530–L540). The fill's CSS
 * transition is disabled under `prefers-reduced-motion` in `station.css`, not here.
 */
export function ProgressBar({
  netMg,
  band,
  displayMaxMg,
  uom,
  zone,
}: {
  netMg: number;
  band: ToleranceBand;
  displayMaxMg: number;
  uom: Uom;
  zone: Zone;
}) {
  const pct = (mg: number) => Math.min(100, Math.max(0, (mg / displayMaxMg) * 100));
  const fillPct = pct(netMg);
  const lo = pct(band.minMg);
  const hi = pct(band.maxMg);

  return (
    <div className="wms-bar-block">
      <div
        className="wms-bar"
        data-zone={zone.toLowerCase()}
        role="progressbar"
        aria-label="Weighing progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fillPct)}
      >
        <div className="fill" style={{ width: `${fillPct}%` }} />
        <div className="band" style={{ left: `${lo}%`, width: `${Math.max(0.6, hi - lo)}%` }} />
        <div className="target-line" style={{ left: `${pct(band.targetMg)}%` }} />
      </div>
      <div className="wms-bar-caption">
        <span>0</span>
        <span>
          TOLERANCE ±{formatQuantity(band.toleranceMg, uom)} {uom} (
          {formatQuantity(band.minMg, uom)} – {formatQuantity(band.maxMg, uom)})
        </span>
        <span>
          {formatQuantity(displayMaxMg, uom)} {uom}
        </span>
      </div>
    </div>
  );
}
