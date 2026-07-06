import { ShieldCheck, AlertTriangle, TrendingUp, Star } from 'lucide-react';
import { evaluateThreeChecks } from '../data/reits';
const FILTERS = [
  {
    id: 'asset',
    label: 'Asset Quality',
    weight: '30%',
    icon: TrendingUp,
    color: 'text-accent-green',
    bgColor: 'bg-accent-green/10',
    borderColor: 'border-accent-green/20',
    questions: [
      'Is occupancy consistently high?',
      'Is WALE (Weighted Average Lease Expiry) healthy?',
      'Are rental reversions positive?',
      'Is tenant concentration diversified?',
      'Are assets strategically located and difficult to replace?',
    ],
  },
  {
    id: 'debt',
    label: 'Debt Quality',
    weight: '25%',
    icon: ShieldCheck,
    color: 'text-accent-blue',
    bgColor: 'bg-accent-blue/10',
    borderColor: 'border-accent-blue/20',
    questions: [
      'Is gearing reasonable (below 40%)?',
      'Is interest coverage safe (above 3x)?',
      'Are debt maturities spread out?',
      'Is the majority of debt fixed-rate?',
      'Can the REIT survive elevated interest rates?',
    ],
  },
  {
    id: 'dpu',
    label: 'DPU Quality',
    weight: '25%',
    icon: Star,
    color: 'text-accent-gold',
    bgColor: 'bg-accent-gold/10',
    borderColor: 'border-accent-gold/20',
    questions: [
      'Is DPU stable or growing?',
      'Is growth organic or acquisition-fueled?',
      'Is equity issuance diluting unitholders?',
      'Are distributions backed by recurring operational cashflow?',
      'Is yield sustainable relative to peers?',
    ],
  },
  {
    id: 'manager',
    label: 'Manager & Sponsor Quality',
    weight: '10%',
    icon: ShieldCheck,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    questions: [
      'Is there a strong sponsor with deep pockets?',
      'Does management allocate capital well?',
      'Are acquisitions accretive to unitholders?',
      'Are fees aligned with unitholders?',
      'Is there a visible development / acquisition pipeline?',
    ],
  },
  {
    id: 'valuation',
    label: 'Valuation & Margin of Safety',
    weight: '10%',
    icon: TrendingUp,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    questions: [
      'Is yield attractive relative to Singapore government bonds?',
      'Is price-to-book reasonable (below 1.0x)?',
      'Is the market pricing in permanent damage or temporary fear?',
      'Is the REIT high-quality enough to deserve a premium valuation?',
    ],
  },
];

const GREEN_FLAGS = [
  'Positive rental reversions',
  'Long WALE (> 4 years)',
  'Occupancy above sector average',
  'Conservative gearing (< 38%)',
  'Fixed-rate debt majority',
  'Sponsor alignment',
  'Accretive acquisitions',
  'Organic DPU growth',
  'Trading below intrinsic value',
];

const RED_FLAGS = [
  'Yield above peers for no obvious reason',
  'Frequent equity fundraising / rights issues',
  'Falling occupancy trend',
  'Weak interest coverage (< 2.5x)',
  'Near-term refinancing wall',
  'Sponsor conflicts of interest',
  'High single-tenant concentration',
  'Aggressive overseas expansion',
  'DPU supported by financial engineering',
];

const SECTOR_PRIORITIES = [
  { sector: 'Retail', focus: 'Tenant sales + footfall + reversions' },
  { sector: 'Office', focus: 'Occupancy + WALE length' },
  { sector: 'Logistics', focus: 'Rental reversions + supply pipeline' },
  { sector: 'Healthcare', focus: 'Lease structure + inflation protection' },
  { sector: 'Hospitality', focus: 'RevPAR cycles + tourism recovery' },
  { sector: 'Data Centres', focus: 'Tenant concentration + power availability' },
  { sector: 'Overseas REITs', focus: 'FX risk + refinancing access' },
];

const SHORTLISTS = [
  {
    title: 'Core Defensive',
    description: 'High-quality, locally anchored, conservative balance sheet',
    color: 'border-accent-green/30',
    labelColor: 'bg-accent-green/15 text-accent-green border-accent-green/30',
    tickers: ['C38U', 'A17U', 'RW0U', 'KDCREIT', 'J69U'],
  },
  {
    title: 'Value Recovery',
    description: 'Quality assets temporarily depressed, trading at wide P/B discount',
    color: 'border-amber-500/30',
    labelColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    tickers: ['K71U', 'N2IU', 'M44U', 'BUOU', 'CY6U'],
  },
  {
    title: 'High Risk / High Yield',
    description: 'Elevated yield, structural challenges, careful sizing required',
    color: 'border-accent-red/30',
    labelColor: 'bg-accent-red/15 text-accent-red border-accent-red/30',
    tickers: ['AJBU', 'BTOU', 'T8B', 'LIPPO', 'AU8U'],
  },
];
function exportToCSV(reits) {
  const headers = ['Rank','Ticker','Name','Sector','Asset','Debt','DPU','Manager','Valuation','Composite','Yield%','Gearing%']
  const rows = [...reits]
    .sort((a, b) => b.composite - a.composite)
    .map((r, i) => [
      i + 1,
      r.ticker,
      `"${r.name}"`,
      r.sector || '',
      r.asset ?? '',
      r.debt ?? '',
      r.dpu ?? '',
      r.manager ?? '',
      r.valuation ?? '',
      r.composite?.toFixed(1) ?? '',
      r.yield != null ? r.yield.toFixed(2) : '',
      r.gearing != null ? r.gearing.toFixed(1) : '',
    ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sgxpty-scorecard-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function FilterCard({ filter }) {
  const Icon = filter.icon;
  return (
    <div className={`bg-bg-card border ${filter.borderColor} rounded-lg p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${filter.bgColor}`}>
            <Icon className={`w-4 h-4 ${filter.color}`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{filter.label}</h3>
            <span className="text-[10px] text-text-muted">Weight: {filter.weight}</span>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {filter.questions.map((q, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
            <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${filter.bgColor}`} />
            {q}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function IntelligencePanel({ reits }) {
  return (
    <div className="flex flex-col gap-8">
      {/* Intro */}
      <div className="bg-bg-card border border-border rounded-lg p-6">
        <h2 className="text-base font-semibold text-text-primary mb-2">SGX S-REIT Due Diligence Framework</h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-3">
          A systematic five-filter framework for evaluating S-REITs for long-term income investing.
          Rather than chasing headline dividend yield, the goal is to identify <strong className="text-text-primary">durable cashflow</strong>,
          {' '}<strong className="text-text-primary">survivable balance sheets</strong>, and <strong className="text-text-primary">aligned management</strong>.
        </p>
        <div className="flex items-center gap-2 p-3 bg-accent-gold/5 border border-accent-gold/20 rounded text-xs text-text-secondary">
          <Star className="w-4 h-4 text-accent-gold flex-shrink-0" />
          <span>
            A sustainable 5–6% yield with long-term DPU growth is usually superior to an unstable 8–10% yield.
            The best S-REITs are not necessarily the highest yielding.
          </span>
        </div>
      </div>

      {/* Enhanced 3-Check Screener - Cards + Rich Table */}
      <section className="bg-bg-card border border-accent-gold/30 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-text-primary">3-Check Passive Income Screener</h3>
            <p className="text-sm text-text-secondary mt-1">REITs passing DPU Growth • Gearing &lt;45% • Attractive Yield Spread</p>
          </div>
          <a href="https://growbeansprout.com/singapore-reits-screening-framework" 
             target="_blank" 
             className="text-xs px-4 py-1.5 bg-accent-gold/10 text-accent-gold rounded-full hover:bg-accent-gold/20 transition-colors">
            Beansprout Framework →
          </a>
        </div>

        {/* Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {reits
            .filter(r => evaluateThreeChecks(r).passesAll)
            .slice(0, 6)
            .map(reit => {
              const checks = evaluateThreeChecks(reit);
              return (
                <div key={reit.ticker} className="border border-accent-green/30 bg-bg-elevated rounded-2xl p-6 hover:border-accent-green/50 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-3xl font-bold tracking-tight">{reit.ticker}</div>
                      <div className="text-base text-text-secondary">{reit.shortName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-bold text-accent-gold leading-none">{Number(reit.yield).toFixed(2)}%</div>
                      <div className="text-xs text-text-muted">YIELD</div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Rich Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="text-left py-3 px-4 font-medium">REIT</th>
                <th className="text-right py-3 px-4 font-medium">Yield</th>
                <th className="text-right py-3 px-4 font-medium">P/B</th>
                <th className="text-right py-3 px-4 font-medium">Gearing</th>
                <th className="text-right py-3 px-4 font-medium">Yield Spread</th>
                <th className="text-left py-3 px-4 font-medium">Sector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {reits
                .filter(r => evaluateThreeChecks(r).passesAll)
                .slice(0, 15)
                .map(reit => {
                  const checks = evaluateThreeChecks(reit);
                  return (
                    <tr key={reit.ticker} className="hover:bg-bg-elevated/70 transition-colors">
                      <td className="py-4 px-4 font-medium">
                        {reit.ticker} <span className="text-text-muted text-xs">({reit.shortName})</span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-accent-gold">{Number(reit.yield).toFixed(2)}%</td>
                      <td className="py-4 px-4 text-right">{reit.pb ? reit.pb.toFixed(2) : '—'}</td>
                      <td className="py-4 px-4 text-right">{reit.gearing}%</td>
                      <td className="py-4 px-4 text-right font-medium text-green-400">+{checks.yieldSpread}%</td>
                      <td className="py-4 px-4 text-text-muted">{reit.sector}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-text-muted mt-8">
          Showing REITs that pass all 3 checks • Data is for screening purposes only
        </p>
      </section>
      
      {/* Five Filters */}
      <section>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">The Five Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {FILTERS.map((f) => <FilterCard key={f.id} filter={f} />)}
        </div>
      </section>

      {/* Sector Priorities */}
      <section>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Sector-Specific Focus Areas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {SECTOR_PRIORITIES.map((s) => (
            <div key={s.sector} className="bg-bg-card border border-border rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-text-primary mb-1">{s.sector}</p>
              <p className="text-xs text-text-muted">{s.focus}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Green / Red Flags */}
      <section>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Signal Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-card border border-accent-green/20 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-accent-green" />
              <h4 className="text-sm font-semibold text-accent-green">Green Flags</h4>
            </div>
            <ul className="space-y-2">
              {GREEN_FLAGS.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent-green flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-bg-card border border-accent-red/20 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-accent-red" />
              <h4 className="text-sm font-semibold text-accent-red">Red Flags</h4>
            </div>
            <ul className="space-y-2">
              {RED_FLAGS.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Shortlists */}
      <section>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Investor Shortlists</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SHORTLISTS.map((sl) => (
            <div key={sl.title} className={`bg-bg-card border ${sl.color} rounded-lg p-5`}>
              <h4 className="text-sm font-semibold text-text-primary mb-1">{sl.title}</h4>
              <p className="text-xs text-text-muted mb-3">{sl.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {sl.tickers.map((t) => (
                  <span
                    key={t}
                    className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${sl.labelColor}`}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Scoring Framework */}
      <section>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Scoring Framework</h3>
        <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-bg-elevated border-b border-border">
                <th className="px-4 py-2.5 text-left text-text-secondary font-semibold uppercase tracking-wide">Category</th>
                <th className="px-4 py-2.5 text-right text-text-secondary font-semibold uppercase tracking-wide">Weight</th>
                <th className="px-4 py-2.5 text-left text-text-secondary font-semibold uppercase tracking-wide hidden sm:table-cell">Key Metric</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cat: 'Asset Quality', wt: '30%', metric: 'Occupancy, WALE, Rental Reversions' },
                { cat: 'Debt Quality', wt: '25%', metric: 'Gearing, ICR, Fixed-Rate %, Maturity Profile' },
                { cat: 'DPU Quality', wt: '25%', metric: 'DPU Growth, Payout Ratio, Equity Dilution' },
                { cat: 'Manager Quality', wt: '10%', metric: 'Sponsor Strength, Acquisition Track Record' },
                { cat: 'Valuation', wt: '10%', metric: 'Yield Spread, Price-to-Book, NAV Discount' },
              ].map((row, i) => (
                <tr key={row.cat} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary/40'}`}>
                  <td className="px-4 py-2.5 text-text-primary font-medium">{row.cat}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-accent-gold">{row.wt}</td>
                  <td className="px-4 py-2.5 text-text-muted hidden sm:table-cell">{row.metric}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Five Filters Scorecard */}
      <section>
        <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
              Five Filters Scorecard — All 39 REITs
            </h3>
            <button
              onClick={() => exportToCSV(reits)}
              className="flex items-center gap-1.5 px-3 py-1 rounded border border-border hover:border-accent-gold/40 hover:text-accent-gold text-text-muted text-[11px] font-medium transition-all"
            >
              ↓ Export CSV
            </button>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-green inline-block" />
              4.0 – 5.0 Strong
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              3.0 – 3.9 Acceptable
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent-red inline-block" />
              0 – 2.9 Weak
            </span>
          </div>
        </div>
        <div className="bg-bg-card border border-border rounded-lg overflow-hidden overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="bg-bg-elevated border-b border-border">
                <th className="px-3 py-2.5 text-left text-text-secondary font-semibold uppercase tracking-wide">#</th>
                <th className="px-3 py-2.5 text-left text-text-secondary font-semibold uppercase tracking-wide">Ticker</th>
                <th className="px-3 py-2.5 text-left text-text-secondary font-semibold uppercase tracking-wide">Name</th>
                <th className="px-3 py-2.5 text-center text-text-secondary font-semibold uppercase tracking-wide">Asset</th>
                <th className="px-3 py-2.5 text-center text-text-secondary font-semibold uppercase tracking-wide">Debt</th>
                <th className="px-3 py-2.5 text-center text-text-secondary font-semibold uppercase tracking-wide">DPU</th>
                <th className="px-3 py-2.5 text-center text-text-secondary font-semibold uppercase tracking-wide">Mgr</th>
                <th className="px-3 py-2.5 text-center text-text-secondary font-semibold uppercase tracking-wide">Val</th>
                <th className="px-3 py-2.5 text-center text-text-secondary font-semibold uppercase tracking-wide">Score</th>
                <th className="px-3 py-2.5 text-right text-text-secondary font-semibold uppercase tracking-wide">Yield</th>
                <th className="px-3 py-2.5 text-right text-text-secondary font-semibold uppercase tracking-wide">Gear</th>
              </tr>
            </thead>
            <tbody>
              {[...reits]
                .sort((a, b) => b.composite - a.composite)
                .map((reit, i) => {
                  const scoreBg = (v) =>
                    v >= 4 ? 'bg-accent-green/15 border-accent-green/30 text-accent-green' :
                    v >= 3 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' :
                    'bg-accent-red/15 border-accent-red/30 text-accent-red'
                  return (
                    <tr
                      key={reit.ticker}
                      className={`border-b border-border/50 transition-colors hover:bg-bg-hover ${
                        i % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary/40'
                      }`}
                    >
                      <td className="px-3 py-2 text-text-muted">{i + 1}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono font-bold text-accent-gold">{reit.ticker}</span>
                      </td>
                      <td className="px-3 py-2 text-text-secondary max-w-[160px] truncate" title={reit.name}>
                        {reit.shortName || reit.name}
                      </td>
                      {['asset', 'debt', 'dpu', 'manager', 'valuation'].map((key) => (
                        <td key={key} className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded border text-[10px] font-bold ${scoreBg(reit[key])}`}>
                            {reit[key]}
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1.5 rounded border font-bold text-[11px] ${scoreBg(reit.composite)}`}>
                          {reit.composite?.toFixed(1)}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${
                        reit.yield >= 7 ? 'text-accent-green' :
                        reit.yield >= 5 ? 'text-amber-400' :
                        'text-text-muted'
                      }`}>
                        {reit.yield != null ? reit.yield.toFixed(2) + '%' : '—'}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${
                        reit.gearing <= 35 ? 'text-accent-green' :
                        reit.gearing <= 42 ? 'text-amber-400' :
                        'text-accent-red'
                      }`}>
                        {reit.gearing != null ? reit.gearing.toFixed(1) + '%' : '—'}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-text-muted mt-2">
          Scores are based on static fundamental data. Ratings 1–5 per filter, weighted composite. Not financial advice.
        </p>
      </section>
    </div>
  );
}
