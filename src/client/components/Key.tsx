import type { ButtonHTMLAttributes } from 'react';

/** A station action key, sized for gloved hands (NFR-3: ≥ 15 mm / 60 px). */
export function Key(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return <button type="button" className={`wms-key ${className ?? ''}`.trim()} {...rest} />;
}
