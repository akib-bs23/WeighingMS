const BAR_COUNT = 48;

/**
 * A simple decorative bar rendering of `value` (story 006) — not a real, scannable Code 128
 * encoder. Barcode symbology is genuinely open for the real product (brief OQ-12); this training
 * build only needs something that reads as "a barcode is here," re-implemented from scratch
 * rather than copying the prototype's own (also-decorative) rendering.
 */
export function Barcode({ value }: { value: string }) {
  const codes = Array.from(value).map((c) => c.codePointAt(0) ?? 0);
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const code = codes[i % codes.length] ?? 0;
    return { widthPx: 1 + ((code + i * 7) % 3), gap: (code + i) % 3 === 0 };
  });

  return (
    <div className="wms-barcode" aria-hidden="true">
      {bars.map((bar, i) => (
        <i
          key={i}
          style={{ width: `${bar.widthPx}px`, background: bar.gap ? 'transparent' : undefined }}
        />
      ))}
    </div>
  );
}
