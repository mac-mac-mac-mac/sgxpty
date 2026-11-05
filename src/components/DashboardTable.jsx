import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Plus, Check } from 'lucide-react';
import PNavBadge from './PNavBadge';
import GearingPill from './GearingPill';

// ── Column definitions ────────────────────────────────────────────────────────
// Every market number below is calculated nightly (see scripts/fetch-prices.mjs).

const REIT_COLS_YIELD = [
  { key: 'ticker',    label: 'Ticker',        align: 'left' },
  { key: 'name',      label: 'Name',          align: 'left' },
  { key: 'sector',    label: 'Sector',        align: 'left' },
  { key: 'price',     label: 'Price',         align: 'right',  format: 'price' },
  { key: 'change',    label: '% Chg',         align: 'right',  format: 'change' },
  { key: 'marketCap', label: 'Mkt Cap',       align: 'right',  format: 'number' },
  { key: 'yield',     label: 'Yield %',       align: 'right',  format: 'pct' },
  { key: 'pb',        label: 'P/NAV',         align: 'right',  format: 'decimal' },
  { key: 'gearing',   label: 'Gearing est. %', align: 'right', format: 'pct' },
  { key: 'asset',     label: 'Asset',         align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'debt',      label: 'Debt',          align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'dpu',       label: 'DPU',           align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'manager',   label: 'Mgr',           align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'valuation', label: 'Val',           align: 'center', format: 'rating', group: 'Five Filters' },
  { key: 'composite', label: 'Comp',          align: 'center', format: 'composite' },
];

const REIT_COLS_VALUATION = [
  { key: 'ticker',             label: 'Ticker',         align: 'left' },
  { key: 'name',               label: 'Name',           align: 'left' },
  { key: 'sector',             label: 'Sector',         align: 'left' },
  { key: 'price',              label: 'Price',          align: 'right',  format: 'price' },
  { key: 'nav',                label: 'NAV',            align: 'right',  format: 'decimal' },
  { key: 'pb',                 label: 'P/NAV',          align: 'center', format: 'pnav' },
  { key: 'gearing',            label: 'Gearing (est.)', align: 'center', format: 'gearing' },
  { key: 'dpuGrowth',          label: 'DPU Growth',     align: 'right',  format: 'dpugrowth' },
  { key: 'distributionStatus', label: 'Dist. Status',   align: 'center', format: 'diststatus' },
  { key: 'yield',              label: 'Yield %',        align: 'right',  format: 'pct' },
  { key: 'composite',          label: 'Comp',           align: 'center', format: 'composite' },
];

const STOCK_COLS = [
  { key: 'ticker',            label: 'Ticker',     align: 'left' },
  { key: 'name',              label: 'Name',       align: 'left' },
  { key: 'sector',            label: 'Sector',     align: 'left' },
  { key: 'price',             label: 'Price',      align: 'right',  format: 'price' },
  { key: 'change',            label: '% Chg',      align: 'right',  format: 'change' },
  { key: 'marketCap',         label: 'Mkt Cap',    align: 'right',  format: 'number' },
  { key: 'yield',             label: 'Yield %',    align: 'right',  format: 'pct' },
  { key: 'dpuGrowth',         label: 'DPU Growth', align: 'right',  format: 'dpugrowth' },
  { key: 'pe',                label: 'P/E',        align: 'right',  format: 'decimal' },
  { key: 'dividendFrequency', label: 'Frequency',  align: 'center' },
];

const ETF_COLS = [
  { key: 'ticker',       label: 'Ticker',      align: 'left' },
  { key: 'name',         label: 'Name',        align: 'left' },
  { key: 'category',     label: 'Category',    align: 'left' },
  { key: 'assetClass',   label: 'Asset Class', align: 'left' },
  { key: 'price',        label: 'Price',       align: 'right', format: 'price' },
  { key: 'change',       label: '% Chg',       align: 'right', format: 'change' },
  { key: 'aum',          label: 'AUM (M)',     align: 'right', format: 'number' },
  { key: 'yield',        label: 'Yield %',     align: 'right', format: 'pct' },
  { key: 'expenseRatio', label: 'TER %',       align: 'right', format: 'decimal' },
];

// ── Cell formatters ───────────────────────────────────────────────────────────

function SortIcon({ col, sort }) {
  if (sort.key !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
  return sort.dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-accent-gold" />
    : <ChevronDown className="w-3 h-3 text-accent-gold" />;
}

function formatCell(value, format, currency) {
  if (format === 'pnav')       return <PNavBadge pb={value} />;
  if (format === 'gearing')    return <GearingPill gearing={value} />;
  if (format === 'diststatus') return <DistStatusBadge status={value} />;
  if (format === 'dpugrowth')  return <DpuGrowthCell value={value} />;

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
      return (
        <span className="font-mono text-xs">
          {typeof value === 'number'
            ? value >= 1_000_000_000
              ? (value / 1_000_000_000).toFixed(2) + 'B'
              : value >= 1_000_000
              ? (value / 1_000_000).toFixed(0) + 'M'
              : value.toLocaleString()
            : value}
        </span>
      );
    case 'pct':
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

// ── Sub-components ────────────────────────────────────────────────────────────

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
  const color = v >= 4.0
    ? 'bg-accent-gold/20 text-accent-gold border-accent-gold/40'
    : v >= 3.0
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : v >= 2.0
    ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
    : 'bg-accent-red/15 text-accent-red border-accent-red/30';
  return (
    <span className={`inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1 rounded border text-[10px] font-bold ${color}`}>
      {v.toFixed(1)}
    </span>
  );
}

function SectorBadge({ sector }) {
  const colors = {
    'Diversified':        'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Industrial':         'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Retail':             'bg-pink-500/10 text-pink-400 border-pink-500/20',
    'Office':             'bg-sky-500/10 text-sky-400 border-sky-500/20',
    'Healthcare':         'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'Hospitality':        'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'Residential':        'bg-violet-500/10 text-violet-400 border-violet-500/20',
    'Infrastructure':     'bg-slate-400/10 text-slate-400 border-slate-400/20',
    'Equity':             'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Fixed Income':       'bg-green-500/10 text-green-400 border-green-500/20',
    'REIT':               'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Commodity':          'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'Money Market':       'bg-teal-500/10 text-teal-400 border-teal-500/20',
    'Banks':              'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Telco':              'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    'Gaming':             'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    'Conglomerate':       'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'Financial Services': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Real Estate':        'bg-sky-500/10 text-sky-400 border-sky-500/20',
    'Aviation':           'bg-rose-500/10 text-rose-400 border-rose-500/20',
    'Utilities':          'bg-lime-500/10 text-lime-400 border-lime-500/20',
    'Agribusiness':       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };
  if (!sector) return <span className="text-text-muted">—</span>;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap ${colors[sector] || 'bg-bg-elevated text-text-secondary border-border'}`}>
      {sector}
    </span>
  );
}

function DistStatusBadge({ status }) {
  if (!status) return <span className="text-text-muted">—</span>;
  const map = {
    active:    { cls: 'bg-accent-green/10 text-accent-green border-accent-green/30', label: 'Active' },
    reduced:   { cls: 'bg-accent-gold/10 text-accent-gold border-accent-gold/30',   label: 'Reduced' },
    suspended: { cls: 'bg-accent-red/10 text-accent-red border-accent-red/30',       label: 'Suspended' },
  };
  const { cls, label } = map[status] || { cls: 'bg-bg-elevated text-text-secondary border-border', label: status };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function DpuGrowthCell({ value }) {
  if (value == null || isNaN(value)) return <span className="text-text-muted font-mono text-xs">—</span>;
  const v = parseFloat(value);
  const color = v > 0 ? 'text-accent-green' : v < 0 ? 'text-accent-red' : 'text-text-muted';
  return (
    <span className={`font-mono text-xs ${color}`}>
      {v > 0 ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

// Green dot = live price received this session; hollow = last close from the nightly job.
function LiveDot({ row }) {
  const cls = row.isLive ? 'bg-accent-green' : row.stale ? 'border border-amber-400' : 'border border-text-muted';
  return <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />;
}

function priceTitle(row) {
  if (row.isLive) {
    const t = row.liveAt ? new Date(row.liveAt).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    return `Live price${t ? ` · updated ${t}` : ''}`;
  }
  return row.stale ? 'Last close — the nightly update missed this ticker, so it may be out of date' : 'Last close (updated nightly)';
}

function PriceCell({ row }) {
  if (row.price == null) return <span className="text-text-muted">—</span>;
  return (
    <span
      title={priceTitle(row)}
      className={`inline-flex items-center justify-end gap-1.5 rounded px-1 font-mono text-xs ${row.isLive ? 'sgxpty-flash' : ''}`}
    >
      <LiveDot row={row} />
      {row.currency && <span className="text-text-muted text-[10px]">{row.currency}</span>}
      {row.price.toFixed(row.price < 1 ? 3 : 2)}
    </span>
  );
}

const fmt = (v, dp = 2, suffix = '') => (v != null && !isNaN(v) ? Number(v).toFixed(dp) + suffix : '—');

// ── Mobile card ───────────────────────────────────────────────────────────────

function MobileCard({ row, isInCompare, canAdd, onCompareToggle, mode, view }) {
  const change = row.change;
  const changeColor = change > 0 ? 'text-accent-green' : change < 0 ? 'text-accent-red' : 'text-text-muted';
  const isValuation = mode === 'reits' && view === 'valuation';
  const fourth =
    mode === 'reits' ? { label: 'Gear est.', value: fmt(row.gearing, 1, '%') }
    : mode === 'stocks' ? { label: 'P/E', value: fmt(row.pe, 1) }
    : { label: 'TER', value: fmt(row.expenseRatio, 2, '%') };

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-sm font-bold text-accent-gold">{row.ticker}</span>
          <span className="text-xs text-text-secondary truncate max-w-[200px]">{row.name}</span>
        </div>
        <button
          onClick={() => onCompareToggle(row)}
          disabled={!canAdd && !isInCompare}
          className={`flex-shrink-0 w-6 h-6 rounded border flex items-center justify-center transition-all ${
            isInCompare
              ? 'bg-accent-gold/20 border-accent-gold/50 text-accent-gold'
              : canAdd
              ? 'border-border hover:border-accent-gold/50 text-text-muted'
              : 'border-border/30 opacity-30 cursor-not-allowed'
          }`}
        >
          {isInCompare ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </button>
      </div>

      {!isValuation && (
        <div className="grid grid-cols-4 gap-1 text-center">
          <div className="bg-bg-elevated rounded p-1.5">
            <div className="text-[10px] text-text-muted mb-0.5">Price</div>
            <div className="font-mono text-xs font-semibold inline-flex items-center gap-1" title={priceTitle(row)}>
              <LiveDot row={row} />
              {row.price != null ? row.price.toFixed(row.price < 1 ? 3 : 2) : '—'}
            </div>
          </div>
          <div className="bg-bg-elevated rounded p-1.5">
            <div className="text-[10px] text-text-muted mb-0.5">Chg%</div>
            <div className={`font-mono text-xs font-semibold ${changeColor}`}>
              {change != null ? (change > 0 ? '+' : '') + change.toFixed(2) + '%' : '—'}
            </div>
          </div>
          <div className="bg-bg-elevated rounded p-1.5">
            <div className="text-[10px] text-text-muted mb-0.5">Yield</div>
            <div className="font-mono text-xs font-semibold text-accent-gold">{fmt(row.yield, 2, '%')}</div>
          </div>
          <div className="bg-bg-elevated rounded p-1.5">
            <div className="text-[10px] text-text-muted mb-0.5">{fourth.label}</div>
            <div className="font-mono text-xs font-semibold">{fourth.value}</div>
          </div>
        </div>
      )}

      {isValuation && (
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-bg-elevated rounded p-1.5 flex flex-col gap-1">
            <div className="text-[10px] text-text-muted">P/NAV</div>
            <PNavBadge pb={row.pb} />
          </div>
          <div className="bg-bg-elevated rounded p-1.5 flex flex-col gap-1">
            <div className="text-[10px] text-text-muted">Gearing (est.)</div>
            <GearingPill gearing={row.gearing} />
          </div>
          <div className="bg-bg-elevated rounded p-1.5 flex flex-col gap-1">
            <div className="text-[10px] text-text-muted">DPU Growth</div>
            <DpuGrowthCell value={row.dpuGrowth} />
          </div>
          <div className="bg-bg-elevated rounded p-1.5 flex flex-col gap-1">
            <div className="text-[10px] text-text-muted">Dist. Status</div>
            <DistStatusBadge status={row.distributionStatus} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <SectorBadge sector={row.sector || row.category} />
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {mode === 'stocks' && row.dividendFrequency && <span>{row.dividendFrequency}</span>}
          {mode === 'reits' && row.composite != null && <CompositeBadge value={row.composite} />}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DashboardTable({
  data,
  mode,
  view = 'yield',
  search,
  onSearchChange,
  sectorFilter,
  onSectorFilter,
  sectors,
  compareList,
  onCompareToggle,
}) {
  const [sort, setSort] = useState({ key: 'marketCap', dir: 'desc' });

  const cols =
    mode === 'stocks' ? STOCK_COLS
    : mode === 'etfs' ? ETF_COLS
    : view === 'valuation' ? REIT_COLS_VALUATION
    : REIT_COLS_YIELD;

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
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  }

  const placeholder = mode === 'reits' ? 'Search REITs…' : mode === 'stocks' ? 'Search stocks…' : 'Search ETFs…';

  return (
    <div className="flex flex-col gap-4">
      <style>{`@keyframes sgxptyFlash{0%{background-color:rgba(34,197,94,.35)}100%{background-color:transparent}}.sgxpty-flash{animation:sgxptyFlash 1.6s ease-out}`}</style>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
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

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-text-muted -mt-2">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-green" />Live price (updated just now)</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block w-1.5 h-1.5 rounded-full border border-text-muted" />Last close (updated nightly)</span>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-2 md:hidden">
        {filtered.map((row) => {
          const isInCompare = compareList && compareList.some((c) => c.ticker === row.ticker);
          const canAdd = compareList && compareList.length < 2 && !isInCompare;
          return (
            <MobileCard
              key={row.ticker}
              row={row}
              isInCompare={isInCompare}
              canAdd={canAdd}
              onCompareToggle={onCompareToggle}
              mode={mode}
              view={view}
            />
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">No results found</div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            {mode === 'reits' && view === 'yield' && (
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
                      className={`px-3 py-2.5 ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {col.key === 'ticker' ? (
                        <span className="font-mono text-xs font-semibold text-accent-gold">{row.ticker}</span>
                      ) : col.key === 'name' ? (
                        <span className="text-xs text-text-primary max-w-48 block truncate" title={row.name}>{row.name}</span>
                      ) : col.key === 'sector' || col.key === 'category' ? (
                        <SectorBadge sector={row.sector || row.category} />
                      ) : col.key === 'assetClass' ? (
                        <span className="text-xs text-text-secondary truncate max-w-32 block" title={row.assetClass}>{row.assetClass}</span>
                      ) : col.key === 'dividendFrequency' ? (
                        <span className="text-xs text-text-secondary">{row.dividendFrequency || '—'}</span>
                      ) : col.key === 'price' ? (
                        <PriceCell row={row} />
                      ) : (
                        formatCell(row[col.key], col.format, null)
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
    </div>
  );
}
