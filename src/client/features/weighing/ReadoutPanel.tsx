import type { Uom } from '../../../shared/contracts/orgatex';
import { formatQuantity } from '../../../shared/quantity/format-quantity';
import type { Zone } from '../../../shared/weighing/tolerance';
import { remaining } from '../../../shared/weighing/tolerance';

/** Weighed now / Still to weigh / Target readouts (prototype L515–L528). */
export function ReadoutPanel({
  netMg,
  targetMg,
  uom,
  zone,
  offline,
  invalid,
}: {
  netMg: number;
  targetMg: number;
  uom: Uom;
  zone: Zone;
  /** Scale unreachable (story 007/FR-29) — takes priority over `invalid` and `zone`. */
  offline: boolean;
  /** Present-but-impossible reading (story 007/FR-30) — takes priority over `zone`. */
  invalid: boolean;
}) {
  const dataZone = offline ? 'offline' : invalid ? 'invalid' : zone.toLowerCase();
  return (
    <div className="wms-readout">
      <div className="cell live" data-zone={dataZone}>
        <span className="k">Weighed now</span>
        <span className="v">
          {offline ? 'SCALE OFFLINE' : invalid ? 'INVALID READING' : formatQuantity(netMg, uom)}{' '}
          {!offline && !invalid && <span className="u">{uom}</span>}
        </span>
      </div>
      <div className="cell">
        <span className="k">Still to weigh</span>
        <span className="v">
          {formatQuantity(remaining(targetMg, netMg), uom)} <span className="u">{uom}</span>
        </span>
      </div>
      <div className="cell">
        <span className="k">Target</span>
        <span className="v">
          {formatQuantity(targetMg, uom)} <span className="u">{uom}</span>
        </span>
      </div>
    </div>
  );
}
