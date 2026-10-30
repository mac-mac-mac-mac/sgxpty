import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

function SoraTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-elevated border border-border rounded px-3 py-2 text-xs font-mono shadow-lg">
      <div className="text-text-muted mb-0.5">{label}</div>
      <div className="text-accent-gold font-bold text-sm">{payload[0].value.toFixed(4)}%</div>
    </div>
  );
}

function RateCard({ label, value, sub, color = 'text-text-primary', badge, badgeColor }) {
  return (
    <div className="bg-bg-elevated border border-border rounded-xl p-5 flex flex-col gap-1">
      <div className="text-[11px] text-text-muted uppercase tracking-widest">{label}</div>
      <div className={`text-3xl font-bold font-mono ${color}`}>
        {value != null ? `${value}%` : '—'}
      </div>
      {sub && <div className="text-xs text-text-muted">{sub}</div>}
      {badge && (
        <span className={`self-start mt-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function FxRow({ pair, rate, change }) {
  const up = change > 0;
  const dn = change < 0;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="font-mono text-sm font-semibold text-text-primary">{pair}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm">{rate}</span>
      </div>
    </div>
  );
}

export default function RatesPanel() {
  const [soraRate, setSoraRate]     = useState(null);
  const [history, setHistory]       = useState([]);
  const [spread, setSpread]         = useState(0.45);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [loading, setLoading]       = useState(true);

  // US rates + FX
  const [usRates, setUsRates]       = useState(null);
  const [fxRates, setFxRates]       = useState(null);
  const [ratesDate, setRatesDate]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [soraRes, ratesRes] = await Promise.all([
          fetch('/sora.json'),
          fetch('/rates.json'),
        ]);

        if (soraRes.ok) {
          const s = await soraRes.json();
          setSoraRate(s.soraRate);
          setLastUpdated(new Date(s.lastUpdated));
          setEffectiveDate(s.effectiveDate);
          if (Array.isArray(s.history) && s.history.length > 0) {
            setHistory(s.history.map(p => ({ label: p.quarter, rate: p.rate })));
          }
        }

        if (ratesRes.ok) {
          const r = await ratesRes.json();
          setUsRates(r.us);
          setFxRates(r.fx?.rates);
          setRatesDate(r.us?.date || r.fx?.date);
        }
      } catch (err) {
        console.warn('Rates fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const soraNum   = parseFloat(soraRate) || 0;
  const spreadNum = parseFloat(spread)   || 0;
  const effective = soraRate != null ? (soraNum + spreadNum).toFixed(2) : '—';

  const [period, setPeriod] = useState('2Y');

  const periodSlice = { '3Q': 3, '1Y': 4, '2Y': 8 };
  const chartData = history.slice(-periodSlice[period]);

  const rates     = chartData.map(p => p.rate);
  const chartMin  = rates.length ? Math.min(...rates) : 0;
  const chartMax  = rates.length ? Math.max(...rates) : 2;
  const chartStart = rates[0] ?? null;
  const chartChange = chartStart != null ? (soraNum - chartStart).toFixed(4) : null;
  const chartChangePct = chartStart != null
    ? (((soraNum - chartStart) / chartStart) * 100).toFixed(2) : null;
  const highPoint = chartData.reduce((a, b) => b.rate > a.rate ? b : a, chartData[0] ?? { label: '—', rate: 0 });
  const lowPoint  = chartData.reduce((a, b) => b.rate < a.rate ? b : a, chartData[0] ?? { label: '—', rate: 99 });
  const yPad      = (chartMax - chartMin) * 0.15 || 0.1;
  const yDomain   = [Math.max(0, chartMin - yPad), chartMax + yPad];

  const spreadColor = usRates?.spread10y2y != null
    ? usRates.spread10y2y >= 0 ? 'text-accent-green' : 'text-accent-red'
    : 'text-text-primary';
  const spreadBadge = usRates?.spread10y2y != null
    ? usRates.spread10y2y >= 0 ? 'Normal' : 'Inverted'
    : null;
  const spreadBadgeColor = usRates?.spread10y2y != null && usRates.spread10y2y >= 0
    ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
    : 'bg-accent-red/10 text-accent-red border-accent-red/30';

  const FX_PAIRS = [
    { code: 'USD', label: 'SGD / USD', desc: 'US Dollar' },
    { code: 'MYR', label: 'SGD / MYR', desc: 'Malaysian Ringgit' },
    { code: 'AUD', label: 'SGD / AUD', desc: 'Australian Dollar' },
    { code: 'HKD', label: 'SGD / HKD', desc: 'Hong Kong Dollar' },
    { code: 'JPY', label: 'SGD / JPY', desc: 'Japanese Yen' },
  ];

  return (
    <div className="max-w-4xl mx-auto pt-4 flex flex-col gap-6">

      {/* ── SORA Calculator ───────────────────────────────────────────────── */}
      <div className="bg-bg-card border border-accent-gold/30 rounded-3xl p-8">
        <h2 className="text-3xl font-bold text-center mb-2">SORA Rates Calculator</h2>
        <p className="text-center text-text-muted mb-10 text-sm">3M Compounded SORA + Adjustable Spread</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-bg-elevated border border-border rounded-2xl p-8 text-center flex flex-col justify-center">
            <div className="text-sm text-text-muted mb-3 uppercase tracking-widest text-xs">Current 3M SORA</div>
            <div className="text-6xl font-bold text-accent-gold tracking-tighter">
              {loading ? '…' : soraRate != null ? soraNum.toFixed(2) : '—'}%
            </div>
            {effectiveDate && <div className="text-xs text-text-muted mt-2">{effectiveDate}</div>}
            {lastUpdated && (
              <div className="text-xs text-green-400 mt-3 flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {lastUpdated.toLocaleDateString('en-SG')}
              </div>
            )}
          </div>
          <div className="bg-bg-elevated border border-border rounded-2xl p-8 text-center flex flex-col justify-center">
            <div className="text-xs text-text-muted mb-3 uppercase tracking-widest">Spread Over SORA (%)</div>
            <input
              type="number"
              step="0.01"
              value={spread}
              onChange={e => setSpread(e.target.value)}
              className="w-full text-6xl font-bold text-center bg-transparent focus:outline-none text-accent-gold border-b border-accent-gold"
            />
          </div>
          <div className="bg-gradient-to-br from-accent-gold/10 to-bg-elevated border border-accent-gold/50 rounded-2xl p-8 text-center flex flex-col justify-center">
            <div className="text-xs text-text-muted mb-3 uppercase tracking-widest">Effective Rate</div>
            <div className="text-6xl font-bold text-accent-gold tracking-tighter">{effective}%</div>
          </div>
        </div>
      </div>

      {/* ── SORA Chart ────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="bg-bg-card border border-border rounded-2xl p-6">
          {/* Period tabs */}
          <div className="flex gap-1 mb-5">
            {['3Q','1Y','2Y'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                  period === p
                    ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                    : 'text-text-muted border border-border hover:text-text-primary'
                }`}
              >{p}</button>
            ))}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-widest mb-1">3M Compounded SORA — Quarterly</div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold font-mono">{soraNum.toFixed(4)}</span>
                {chartChange != null && (
                  <span className={`text-lg font-mono font-semibold ${parseFloat(chartChange) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {parseFloat(chartChange) >= 0 ? '+' : ''}{chartChange}
                    <span className="text-sm ml-1">({parseFloat(chartChangePct) >= 0 ? '+' : ''}{chartChangePct}%)</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-6 text-xs font-mono">
              <div><div className="text-text-muted mb-0.5">Start</div><div className="font-semibold">{chartStart?.toFixed(4)}</div></div>
              <div><div className="text-text-muted mb-0.5">High</div><div className="text-accent-green font-semibold">{highPoint.rate.toFixed(4)}</div><div className="text-text-muted text-[10px]">{highPoint.label}</div></div>
              <div><div className="text-text-muted mb-0.5">Low</div><div className="text-accent-red font-semibold">{lowPoint.rate.toFixed(4)}</div><div className="text-text-muted text-[10px]">{lowPoint.label}</div></div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="soraGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b6bc9" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3b6bc9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--color-text-muted,#888)', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} dy={6} />
              <YAxis domain={yDomain} tick={{ fill: 'var(--color-text-muted,#888)', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={42} tickFormatter={v => v.toFixed(2)} />
              <Tooltip content={<SoraTooltip />} />
              {chartStart != null && <ReferenceLine y={chartStart} stroke="rgba(201,160,62,0.35)" strokeDasharray="4 3" />}
              <Area type="monotone" dataKey="rate" stroke="#ffffff" strokeWidth={1.5} fill="url(#soraGradient)" dot={{ fill: '#ffffff', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#c9a03e', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 text-[10px] text-text-muted text-right">Source: PropKaki · MAS 3M Compounded SORA</div>
        </div>
      )}

      {/* ── US Rates ──────────────────────────────────────────────────────── */}
      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-text-primary">US Interest Rates</h3>
            <p className="text-xs text-text-muted mt-0.5">Federal Reserve + US Treasury yields</p>
          </div>
          {ratesDate && (
            <span className="text-xs text-text-muted font-mono">{ratesDate}</span>
          )}
        </div>
        {loading ? (
          <div className="h-24 flex items-center justify-center text-text-muted text-sm animate-pulse">Loading…</div>
        ) : usRates ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <RateCard
              label="Fed Funds Rate"
              value={usRates.fedFunds}
              sub="Target upper bound"
              color="text-text-primary"
            />
            <RateCard
              label="2Y Treasury"
              value={usRates.t2y}
              sub="Short-term rate"
              color="text-sky-400"
            />
            <RateCard
              label="10Y Treasury"
              value={usRates.t10y}
              sub="Long-term rate"
              color="text-accent-gold"
            />
            <RateCard
              label="Yield Curve"
              value={usRates.spread10y2y != null ? `${usRates.spread10y2y > 0 ? '+' : ''}${usRates.spread10y2y}` : null}
              sub="10Y minus 2Y spread"
              color={spreadColor}
              badge={spreadBadge}
              badgeColor={spreadBadgeColor}
            />
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-4">US rates unavailable — run the daily sync to populate</div>
        )}
        <div className="mt-4 text-[10px] text-text-muted">Source: FRED / St. Louis Federal Reserve · Updated daily</div>
      </div>

      {/* ── FX Rates ──────────────────────────────────────────────────────── */}
      <div className="bg-bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-text-primary">SGD Exchange Rates</h3>
            <p className="text-xs text-text-muted mt-0.5">SGD : foreign currency ratio</p>
          </div>
          {ratesDate && (
            <span className="text-xs text-text-muted font-mono">{ratesDate}</span>
          )}
        </div>
        {loading ? (
          <div className="h-24 flex items-center justify-center text-text-muted text-sm animate-pulse">Loading…</div>
        ) : fxRates ? (
          <div className="divide-y divide-border/30">
            {FX_PAIRS.map(({ code, label, desc }) => (
              <div key={code} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-mono text-sm font-semibold text-text-primary">{label}</span>
                  <span className="text-xs text-text-muted ml-2">{desc}</span>
                </div>
                <span className="font-mono text-sm font-bold text-accent-gold">
                  {fxRates[code] != null
                    ? `1 : ${code === 'JPY' ? fxRates[code].toFixed(2) : fxRates[code].toFixed(4)}`
                    : '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-text-muted text-sm py-4">FX rates unavailable — run the daily sync to populate</div>
        )}
        <div className="mt-4 text-[10px] text-text-muted">Source: Open Exchange Rates · Updated daily</div>
      </div>

    </div>
  );
}
