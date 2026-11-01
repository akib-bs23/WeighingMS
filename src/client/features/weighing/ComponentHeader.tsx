import type { ComponentView } from '../../../shared/contracts/weighing';
import { formatQuantity } from '../../../shared/quantity/format-quantity';

/** Component identity header (prototype L502–L513), with the real identity indicator (FR-7). */
export function ComponentHeader({ component }: { component: ComponentView }) {
  const tare = component.tareMg !== null ? formatQuantity(component.tareMg, component.uom) : '—';
  return (
    <div className="wms-weigh-head">
      <div className="who">
        <span className="nm">{component.dyestuff.name}</span>
        <span className="meta">
          {component.dyestuff.code} · LOT {component.lotId} · CONTAINER {component.containerId} ·
          TARE {tare} {component.uom}
          <IdentityIndicator component={component} />
        </span>
      </div>
      <ScaleBadge component={component} />
    </div>
  );
}

function IdentityIndicator({ component }: { component: ComponentView }) {
  if (component.identity === 'UNVERIFIED') return null;
  if (component.identity === 'VERIFIED') {
    return (
      <span className="identity-slot verified" title="Dyestuff identity verified">
        ✓ IDENTITY VERIFIED
      </span>
    );
  }
  return (
    <span className="identity-slot mismatch" role="alert">
      ⚠ {component.identityMismatchDetail}
    </span>
  );
}

const SCALE_LABEL: Record<ComponentView['scaleClass'], string> = {
  PRECISION: '3 kg precision',
  FLOOR: '32 kg floor',
};

export function ScaleBadge({ component }: { component: ComponentView }) {
  return (
    <div className="wms-scale-badge">
      <span className="k">Scale selected</span>
      <span className="v">{SCALE_LABEL[component.scaleClass]}</span>
      <span className="auto">automatic</span>
    </div>
  );
}
