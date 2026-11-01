import type { StationContext } from '../../shared/contracts/station';
import { messages } from '../i18n/messages';

export interface BatchCrumb {
  batchId: string;
  orderRef: string;
  machineRef: string;
}

/** Brand, station, batch crumb and operator chip (FR-4). Data comes only from props/station. */
export function TopBar({
  station,
  crumb,
}: {
  station: StationContext | null;
  crumb: BatchCrumb | null;
}) {
  return (
    <div className="wms-topbar">
      <span className="wms-brand">
        <span>{messages.brand}</span>
        {station && <span className="station-id">{station.stationId}</span>}
      </span>
      {crumb && (
        <span className="wms-crumb" aria-label="batch crumb">
          BATCH <b>{crumb.batchId}</b> · ORDER <b>{crumb.orderRef}</b> · MACHINE{' '}
          <b>{crumb.machineRef}</b>
        </span>
      )}
      <span className="wms-spacer" />
      {station && (
        <span className="wms-operator">
          <span className="dot" aria-hidden="true" />
          Operator <b>{station.operator.name}</b> · <span>{station.operator.shift}</span>
        </span>
      )}
    </div>
  );
}
