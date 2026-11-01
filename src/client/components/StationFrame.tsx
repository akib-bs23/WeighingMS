import type { ReactNode } from 'react';

/** The 15" industrial touch terminal bezel + screen (prototype L148–L166, re-implemented). */
export function StationFrame({ children }: { children: ReactNode }) {
  return (
    <div className="wms-device">
      <div className="wms-screen">{children}</div>
    </div>
  );
}
