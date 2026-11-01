import type { Uom } from '../../../shared/contracts/orgatex';
import type { ToleranceBand, Zone } from '../../../shared/weighing/tolerance';
import { statusText } from '../../../shared/weighing/tolerance';

/** Zone-coloured status line with the exact shared-rule wording (story 002 AC5), plus the
 *  SCALE OFFLINE / INVALID READING explanations story 007 adds — wording not specified by any
 *  story, chosen to match the existing "<STATE> — <EXPLANATION>" vocabulary. */
export function StatusLine({
  zone,
  netMg,
  band,
  uom,
  offline,
  invalid,
}: {
  zone: Zone;
  netMg: number;
  band: ToleranceBand;
  uom: Uom;
  offline: boolean;
  invalid: boolean;
}) {
  const dataZone = offline ? 'offline' : invalid ? 'invalid' : zone.toLowerCase();
  const text = offline
    ? 'SCALE OFFLINE — CONFIRM UNAVAILABLE'
    : invalid
      ? 'INVALID READING — CONFIRM UNAVAILABLE'
      : statusText(zone, netMg, band, uom);
  return (
    <div className="wms-status-line" data-zone={dataZone}>
      {text}
    </div>
  );
}
