// GearingPill — Aggregate leverage / gearing ratio pill
// Props: gearing (number) — % leverage
// Green  < 35%  : comfortable
// Amber  35–41% : acceptable
// Orange 42–44% : elevated
// Red    ≥ 45%  : high — approaching MAS statutory ceiling

export default function GearingPill({ gearing }) {
  if (gearing == null || isNaN(gearing)) {
    return <span className="text-text-muted font-mono text-xs">—</span>;
  }

  const pct = parseFloat(gearing);

  let colorClass, label;
  if (pct < 35) {
    colorClass = 'bg-accent-green/10 text-accent-green border-accent-green/30';
    label = 'Low';
  } else if (pct < 42) {
    colorClass = 'bg-accent-gold/10 text-accent-gold border-accent-gold/30';
    label = 'Mid';
  } else if (pct < 45) {
    colorClass = 'bg-accent-red/10 text-accent-red border-accent-red/20';
    label = 'High';
  } else {
    colorClass = 'bg-accent-red/20 text-accent-red border-accent-red/40';
    label = 'MAS Limit';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono leading-none whitespace-nowrap ${colorClass}`}
      title={`Gearing: ${pct.toFixed(1)}%`}
    >
      <span className="font-semibold">{pct.toFixed(1)}%</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}
