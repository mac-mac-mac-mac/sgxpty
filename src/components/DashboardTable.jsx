import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Plus, Check } from 'lucide-react';

const REIT_COLS = [
  { key: 'ticker', label: 'Ticker', align: 'left' },
  { key: 'name', label: 'Name', align: 'left' },
  { key: 'sector', label: 'Sector', align: 'left' },
  { key: 'price', label: 'Price', align: 'right', format: 'price' },
  { key: 'change', label: '% Chg', align: 'right', format: 'change' },
  { key: 'marketCap', label: 'Mkt Cap (M)', align: 'right', format: 'number' },
  { key: 'yield', label: 'Yield %', align: 'right', format: 'pct' },
  { key: 'pb', label: 'P/B', align: 'right', format: 'decimal' },
  { key: 'gearing', label: 'Gearing %', align: 'right', format: 'pct' },
  { key: 'wale', label: 'WALE (yr)', align: 'right', format: 'decimal' },
  { key: 'occupancy', label: 'Occ %', align: 'right', format: 'pct' },
  { key: 'asset', label: 'Asset', align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'debt', label: 'Debt', align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'dpu', label: 'DPU', align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'manager', label: 'Mgr', align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'valuation', label: 'Val', align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'composite', label: 'Comp', align: 'center', format: 'composite' },
];

const ETF_COLS = [
  { key: 'ticker', label: 'Ticker', align: 'left' },
  { key: 'name', label: 'Name', align: 'left' },
  { key: 'category', label: 'Category', align: 'left' },
  { key: 'assetClass', label: 'Asset Class', align: 'left' },
  { key: 'price', label: 'Price', align: 'right', format: 'price' },
  { key: 'change', label: '% Chg', align: 'right', format: 'change' },
  { key: 'aum', label: 'AUM (M)', align: 'right', format: 'number' },
  { key: 'yield', label: 'Yield %', align: 'right', format: 'pct' },
  { key: 'expenseRatio', label: 'TER %', align: 'right', format: 'decimal' },
];

function SortIcon({ col, sort }) {
  if (sort.key !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sort.dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-accent-gold" />
    : <ChevronDown className="w-3 h-3 text-accent-gold" />;
}

function formatCell(value, format, currency) {
  if (value == null || value === '') return <span className="text-text-muted">—</span>;
  switch (format) {
    case 'price':
      return (
        <span className="font-mono text-xs">
          {currency && <span className="text-text-muted mr-1 text-[10px]">{currency}</span>}
          {typeof value === 'number' ? value.toFixed(value < 1 ? 3 : 2) : value}
        </span>
      );
    case 'change': {
      const v = typeof value === 'number' ? value : parseFloat(value);
      const color = v > 0 ? 'text-accent-green' : v < 0 ? 'text-accent-red' : 'text-text-muted';
      return (
        <span className={`font-mono text-xs ${color}`}>
          {v > 0 ? '+' : ''}{v.toFixed(2)}%
        </span>
      );
    }
    case 'number':
      return <span className="font-mono text-xs">{typeof value === 'number' ? value.toLocaleString() : value}</span>;
    case 'pct':
      return <span className="font-mono text-xs">{typeof value === 'number' ? value.toFixed(2) : value}</span>;
    case 'decimal':
      return <span className="font-mono text-xs">{typeof value === 'number' ? value.toFixed(2) : value}</span>;
    case 'rating':
      return <RatingBadge value={value} />;
    case 'composite':
      return <CompositeBadge value={value} />;
    default:
      return <span className="text-xs">{value}</span>;
  }
}

function RatingBadge({ value }) {
  const colors = {
    5: 'bg-accent-green/15 text-accent-green border-accent-green/30',
    4: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    3: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    2: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    1: 'bg-accent-red/15 text-accent-red border-accent-red/30',
  };
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded border text-[10px] font-bold ${colors[value] || 'text-text-muted'}`}>
      {value}
    </span>
  );
}

function CompositeBadge({ value }) {
  if (value == null) return <span className="text-text-muted">—</span>;
  const v = typeof value === 'number' ? value : parseFloat(value);
  const color = v >= 4.0 ? 'bg-accent-gold/20 text-accent-gold border-accent-gold/40' : v >= 3.0 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : v >= 2.0 ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' : 'bg-accent-red/15 text-accent-red border-accent-red/30';
  return (
    <span className={`inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1 rounded border text-[10px] font-bold ${color}`}>
      {v.toFixed(1)}
    </span>
  );
}

function SectorBadge({ sector }) {
  const colors = {
    'Diversified': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Industrial': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Retail': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    'Office': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    'Healthcare': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Hospitality': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Infrastructure': 'bg-slate-400/10 text-slate-400 border-slate-400/20',
    'Equity': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Fixed Income': 'bg-green-500/10 text-green-400 border-green-500/20',
    'REIT': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Commodity': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap ${colors[sector] || 'bg-bg-elevated text-text-secondary border-border'}`}>
      {sector}
    </span>
  );
}

export default function DashboardTable({
  data,
  mode,
  search,
  onSearchChange,
  sectorFilter,
  onSectorFilter,
  sectors,
  compareList,
  onCompareToggle,
}) {
  const [sort, setSort] = useState({ key: 'marketCap', dir: 'desc' });

  const cols = mode === 'reits' ? REIT_COLS : ETF_COLS;

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.ticker.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.sector || r.category || '').toLowerCase().includes(q) ||
          (r.country || '').toLowerCase().includes(q)
      );
    }
    if (sectorFilter && sectorFilter !== 'All') {
      rows = rows.filter((r) => (r.sector || r.category) === sectorFilter);
    }
    rows.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [data, search, sectorFilter, sort]);

  function toggleSort(key) {
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc',
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={mode === 'reits' ? 'Search REITs…' : 'Search ETFs…'}
          className="flex-1 min-w-48 bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold/50 transition-colors"
        />
        <div className="flex flex-wrap gap-1">
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => onSectorFilter(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                sectorFilter === s
                  ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                  : 'text-text-secondary border border-border hover:border-border-active hover:text-text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            {mode === 'reits' && (
              <tr className="border-b border-border bg-bg-elevated">
                {compareList !== undefined && <th className="w-8" />}
                {cols.map((col, ci) => {
                  const prevGroup = ci > 0 ? cols[ci - 1].group : null;
                  const isFirstInGroup = col.group && col.group !== prevGroup;
                  if (!col.group) return <th key={ci} />;
                  if (isFirstInGroup) {
                    const span = cols.filter((c) => c.group === col.group).length;
                    return (
                      <th
                        key={ci}
                        colSpan={span}
                        className="px-2 py-1.5 text-[10px] font-semibold text-accent-gold uppercase tracking-widest text-center border-b border-accent-gold/20 bg-accent-gold/5"
                      >
                        {col.group}
                      </th>
                    );
                  }
                  return null;
                })}
              </tr>
            )}
            <tr className="border-b border-border bg-bg-elevated sticky top-0">
              {compareList !== undefined && (
                <th className="w-8 px-3 py-2.5 text-left">
                  <span className="sr-only">Compare</span>
                </th>
              )}
              {cols.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-text-primary transition-colors ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.align === 'right' && <SortIcon col={col.key} sort={sort} />}
                    {col.label}
                    {(col.align === 'left' || col.align === 'center') && <SortIcon col={col.key} sort={sort} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const isInCompare = compareList && compareList.some((c) => c.ticker === row.ticker);
              const canAdd = compareList && compareList.length < 2 && !isInCompare;
              return (
                <tr
                  key={row.ticker}
                  className={`border-b border-border/50 transition-colors ${
                    i % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary/50'
                  } hover:bg-bg-hover`}
                >
                  {compareList !== undefined && (
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => onCompareToggle(row)}
                        disabled={!canAdd && !isInCompare}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isInCompare
                            ? 'bg-accent-gold/20 border-accent-gold/50 text-accent-gold'
                            : canAdd
                            ? 'border-border hover:border-accent-gold/50 text-text-muted hover:text-accent-gold'
                            : 'border-border/30 opacity-30 cursor-not-allowed'
                        }`}
                        title={isInCompare ? 'Remove from compare' : 'Add to compare'}
                      >
                        {isInCompare ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </button>
                    </td>
                  )}
                  {cols.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {col.key === 'ticker' ? (
                        <span className="font-mono text-xs font-semibold text-accent-gold">{row.ticker}</span>
                      ) : col.key === 'name' ? (
                        <span className="text-xs text-text-primary max-w-48 block truncate" title={row.name}>{row.name}</span>
                      ) : col.key === 'sector' || col.key === 'category' ? (
                        <SectorBadge sector={row.sector || row.category} />
                      ) : col.key === 'assetClass' ? (
                        <span className="text-xs text-text-secondary truncate max-w-32 block" title={row.assetClass}>{row.assetClass}</span>
                      ) : (
                        formatCell(row[col.key], col.format, col.key === 'price' ? row.currency : null)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-8 text-center text-text-muted text-sm">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-muted">{filtered.length} results</p>
    </div>
  );
}
