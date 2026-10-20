// ViewToggle — switches DashboardTable between Yield/Portfolio and Valuation/Debt views
// Props: view ('yield' | 'valuation'), onViewChange (fn)
// Only rendered by parent when mode === 'reits'

export default function ViewToggle({ view, onViewChange }) {
  const btn = (val, label) => (
    <button
      onClick={() => onViewChange(val)}
      className={`px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap ${
        view === val
          ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
          : 'text-text-secondary border border-transparent hover:border-border hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-bg-elevated border border-border rounded-lg">
      {btn('yield', 'Yield & Portfolio')}
      {btn('valuation', 'Valuation & Debt')}
    </div>
  );
}
