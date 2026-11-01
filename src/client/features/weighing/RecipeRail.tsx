import type { ComponentView, SessionView } from '../../../shared/contracts/weighing';
import { formatQuantity } from '../../../shared/quantity/format-quantity';

const SCALE_LABEL: Record<ComponentView['scaleClass'], string> = {
  PRECISION: '3 kg',
  FLOOR: '32 kg',
};

/** Recipe rail (prototype L493–L500, L696–L716): component list with done/active/pending state. */
export function RecipeRail({
  session,
  shadeCode,
  onSelect,
}: {
  session: SessionView;
  shadeCode: string;
  onSelect: (componentId: string) => void;
}) {
  const done = session.components.filter((c) => c.state === 'DONE').length;

  return (
    <aside className="wms-rail">
      <div className="wms-rail-head">
        <span className="t">Recipe · {shadeCode}</span>
        <span className="v">{session.batchId}</span>
        <span className="m">
          {done} of {session.components.length} components weighed
        </span>
      </div>
      <ul className="wms-comps" role="list">
        {session.components.map((component) => (
          <ComponentRow key={component.componentId} component={component} onSelect={onSelect} />
        ))}
      </ul>
    </aside>
  );
}

function ComponentRow({
  component,
  onSelect,
}: {
  component: ComponentView;
  onSelect: (componentId: string) => void;
}) {
  const label =
    component.state === 'DONE'
      ? `✓ ${formatQuantity(component.targetMg, component.uom)}`
      : component.state === 'ACTIVE'
        ? 'WEIGHING'
        : 'PENDING';

  return (
    <li>
      <button
        type="button"
        className="wms-comp"
        data-state={component.state.toLowerCase()}
        onClick={() => {
          if (component.state === 'DONE') return; // done rows are inert (story 003)
          onSelect(component.componentId);
        }}
        aria-label={`${component.dyestuff.name}, ${component.state.toLowerCase()}`}
      >
        <span className="swatch" style={{ background: component.dyestuff.colourHex }} />
        <span>
          <span className="nm">{component.dyestuff.name}</span>
          <br />
          <span className="sub">
            {component.dyestuff.code} · {SCALE_LABEL[component.scaleClass]}
          </span>
        </span>
        <span>
          <span className="qty">
            {formatQuantity(component.targetMg, component.uom)} {component.uom}
          </span>
          <br />
          <span className="st">{label}</span>
        </span>
      </button>
    </li>
  );
}
