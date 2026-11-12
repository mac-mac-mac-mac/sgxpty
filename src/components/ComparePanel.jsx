import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const REIT_FIELDS = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'name', label: 'Name' },
  { key: 'sector', label: 'Sector' },
  { key: 'subsector', label: 'Sub-Sector' },
  { key: 'country', label: 'Country' },
  { key: 'sponsor', label: 'Sponsor' },
  { key: 'price', label: 'Price', format: 'price' },
  { key: 'change', label: '% Change', format: 'change' },
  { key: 'marketCap', label: 'Market Cap', format: 'cap' },
  { key: 'yield', label: 'Dividend Yield %', format: 'pct', higher: 'neutral' },
  { key: 'dpuGrowth', label: 'DPU Growth (YoY)', format: 'change', higher: 'better' },
  { key: 'distributionStatus', label: 'Distribution Status', format: 'status' },
  { key: 'nav', label: 'NAV per Unit', format: 'price' },
  { key: 'pb', label: 'P / NAV', format: 'decimal', higher: 'worse' },
  { key: 'gearing', label: 'Gearing % (est.)', format: 'pct', higher: 'worse' },
  { key: 'asset', label: 'Asset Quality (1–5)', format: 'rating', higher: 'better' },
  { key: 'debt', label: 'Debt Quality (1–5)', format: 'rating', higher: 'better' },
  { key: 'dpu', label: 'DPU Quality (1–5)', format: 'rating', higher: 'better' },
  { key: 'manager', label: 'Manager Quality (1–5)', format: 'rating', higher: 'better' },
  { key: 'valuation', label: 'Valuation (1–5)', format: 'rating', higher: 'better' },
  { key: 'composite', label: 'Composite Score', format: 'composite', higher: 'better' },
  { key: 'listYear', label: 'Listed Year' },
];

const STOCK_FIELDS = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'name', label: 'Name' },
  { key: 'sector', label: 'Sector' },
  { key: 'price', label: 'Price', format: 'price' },
  { key: 'change', label: '% Change', format: 'change' },
  { key: 'marketCap', label: 'Market Cap', format: 'cap' },
  { key: 'yield', label: 'Dividend Yield %', format: 'pct', higher: 'neutral' },
  { key: 'dpuGrowth', label: 'Dividend Growth (YoY)', format: 'change', higher: 'better' },
  { key: 'pe', label: 'P / E', format: 'decimal', higher: 'worse' },
  { key: 'dividendFrequency', label: 'Payout Frequency' },
  { key: 'listYear', label: 'Listed Year' },
];

const ETF_FIELDS = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'assetClass', label: 'Asset Class' },
  { key: 'price', label: 'Price', format: 'price' },
  { key: 'change', label: '% Change', format: 'change' },
  { key: 'aum', label: 'AUM (M)', format: 'number' },
  { key: 'yield', label: 'Distribution Yield %', format: 'pct', higher: 'neutral' },
  { key: 'expenseRatio', label: 'Expense Ratio %', format: 'decimal', higher: 'worse' },
  { key: 'domicile', label: 'Domicile' },
  { key: 'replication', label: 'Replication' },
  { key: 'listYear', label: 'Listed Year' },
];

function formatValue(value, format) {
  if (value == null) return '—';
  switch (format) {
    case 'price':
      return typeof value === 'number' ? value.toFixed(value < 1 ? 3 : 2) : value;
    case 'change':
      return `${value > 0 ? '+' : ''}${typeof value === 'number' ? value.toFixed(2) : value}%`;
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : value;
    case 'cap':
      return typeof value !== 'number' ? value : value >= 1e9 ? (value / 1e9).toFixed(2) + 'B' : value >= 1e6 ? (value / 1e6).toFixed(0) + 'M' : value.toLocaleString();
    case 'status':
      return typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : value;
    case 'pct':
      return `${typeof value === 'number' ? value.toFixed(2) : value}%`;
    case 'decimal':
      return typeof value === 'number' ? value.toFixed(2) : value;
    case 'rating':
      return `${value} / 5`;
    case 'composite':
      return typeof value === 'number' ? value.toFixed(1) : value;
    default:
      return value;
  }
}

function CompareIndicator({ valA, valB, preference }) {
  if (!preference || valA == null || valB == null || preference === 'neutral') return null;
  const numA = typeof valA === 'number' ? valA : parseFloat(valA);
  const numB = typeof valB === 'number' ? valB : parseFloat(valB);
  if (isNaN(numA) || isNaN(numB) || numA === numB) return null;

  const aWins = preference === 'better' ? numA > numB : numA < numB;

  return (
    <span
      className={`ml-1 inline-flex items-center text-[10px] font-medium px-1 rounded ${
        aWins ? 'text-accent-green bg-accent-green/10' : 'text-text-muted bg-bg-elevated'
      }`}
    >
      {aWins ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
    </span>
  );
}

const NOUN = { reits: 'REIT', stocks: 'stock', etfs: 'ETF' };

function EmptySlot({ mode, onAddClick }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-text-muted text-sm">No {NOUN[mode] || 'asset'} selected</p>
      <p className="text-text-muted text-xs">Go to Dashboard and click + to add</p>
    </div>
  );
}

export default function ComparePanel({ compareList, onRemove, mode }) {
  const [a, b] = compareList;
  const fields = mode === 'reits' ? REIT_FIELDS : mode === 'stocks' ? STOCK_FIELDS : ETF_FIELDS;

  if (!a && !b) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <p className="text-text-secondary text-base">No assets selected for comparison</p>
        <p className="text-text-muted text-sm">Switch to the Dashboard tab and click + next to any {NOUN[mode] || 'asset'} to add it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-text-primary">Side-by-Side Comparison</h2>
        <span className="text-xs text-text-muted">Select 2 assets from the Dashboard tab</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] gap-0 rounded-lg border border-border overflow-hidden">
        {/* Header row */}
        <div className="hidden lg:block bg-bg-elevated border-b border-r border-border px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">
          Field
        </div>
        {[a, b].map((item, idx) => (
          <div
            key={idx}
            className="bg-bg-elevated border-b border-r border-border px-3 sm:px-4 py-3 flex items-center justify-between gap-2 min-w-0"
          >
            {item ? (
              <>
                <div className="min-w-0">
                  <span className="font-mono text-sm font-bold text-accent-gold">{item.ticker}</span>
                  <p className="text-xs text-text-secondary truncate max-w-[120px] sm:max-w-40">{item.name}</p>
                </div>
                <button
                  onClick={() => onRemove(item)}
                  aria-label={`Remove ${item.ticker}`}
                  className="shrink-0 p-1.5 -mr-1.5 text-text-muted hover:text-accent-red transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-text-muted text-xs italic">Empty slot</span>
            )}
          </div>
        ))}

        {/* Data rows */}
        {fields.map((field, fi) => (
          <div
            key={field.key}
            className={`contents`}
          >
            <div className={`col-span-2 lg:col-span-1 flex items-center px-3 sm:px-4 pt-2 pb-0.5 lg:py-2.5 lg:border-b lg:border-r lg:border-border/50 text-[10px] lg:text-xs uppercase lg:normal-case tracking-wide lg:tracking-normal text-text-muted lg:text-text-secondary ${fi % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary/40'}`}>
              {field.label}
            </div>
            {[a, b].map((item, idx) => {
              const val = item ? item[field.key] : null;
              const otherVal = idx === 0 ? (b ? b[field.key] : null) : (a ? a[field.key] : null);
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1 px-3 sm:px-4 pb-2 pt-0.5 lg:py-2.5 border-b border-r border-border/50 min-w-0 ${fi % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary/40'}`}
                >
                                    {item ? (
                    <span className={`text-xs font-mono break-words min-w-0 ${
                      field.format === 'change'
                        ? val > 0 ? 'text-accent-green' : val < 0 ? 'text-accent-red' : 'text-text-muted'
                        : 'text-text-primary'
                    }`}>
                      {formatValue(val, field.format)}
                    </span>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                  {idx === 0 && (
                    <CompareIndicator valA={val} valB={otherVal} preference={field.higher} />
                  )}
                  {idx === 1 && (
                    <CompareIndicator valA={val} valB={otherVal} preference={field.higher} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
