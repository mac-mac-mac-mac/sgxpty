// PNavBadge — Price-to-NAV ratio badge
// Props: pb (number) — the P/NAV ratio (price / nav)
// Green  < 0.80 : deep discount
// Green  0.80–0.99 : discount
// Amber  1.00–1.24 : slight premium
// Red    ≥ 1.25 : premium

export default function PNavBadge({ pb }) {
  if (pb == null || isNaN(pb)) {
    return <span className="text-text-muted font-mono text-xs">—</span>;
  }

  const ratio = parseFloat(pb);

  let colorClass, label;
  if (ratio < 0.80) {
    colorClass = 'bg-accent-green/10 text-accent-green border-accent-green/30';
    label = 'Deep Disc.';
  } else if (ratio < 1.00) {
    colorClass = 'bg-accent-green/10 text-accent-green border-accent-green/30';
    label = 'Discount';
  } else if (ratio < 1.25) {
    colorClass = 'bg-accent-gold/10 text-accent-gold border-accent-gold/30';
    label = 'Premium';
  } else {
    colorClass = 'bg-accent-red/10 text-accent-red border-accent-red/30';
    label = 'Rich';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono leading-none whitespace-nowrap ${colorClass}`}
      title={`P/NAV: ${ratio.toFixed(2)}x`}
    >
      <span className="font-semibold">{ratio.toFixed(2)}x</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}
