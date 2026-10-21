import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ── Custom tooltip ────────────────────────────────────────────────────────────
function SoraTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-elevated border border-border rounded px-3 py-2 text-xs font-mono shadow-lg">
      <div className="text-text-muted mb-0.5">{label}</div>
      <div className="text-accent-gold font-bold text-sm">{payload[0].value.toFixed(4)}%</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RatesPanel() {
  const [soraRate, setSoraRate]       = useState(null);
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [spread, setSpread]           = useState(0.45);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/sora.json');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        setSoraRate(data.soraRate);
        setLastUpdated(new Date(data.lastUpdated));
        setEffectiveDate(data.effectiveDate);

        // Map history to recharts-friendly shape
        if (Array.isArray(data.history) && data.history.length > 0) {
          setHistory(data.history.map((p) => ({ label: p.quarter, rate: p.rate })));
        }
      } catch {
        setSoraRate(1.16);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const soraNum     = parseFloat(soraRate) || 0;
  const spreadNum   = parseFloat(spread) || 0;
  const effective   = soraRate !== null ? (soraNum + spreadNum).toFixed(2) : '—';

  // Chart stats
  const rates       = history.map((p) => p.rate);
  const chartMin    = rates.length ? Math.min(...rates) : 0;
  const chartMax    = rates.length ? Math.max(...rates) : 2;
  const chartStart  = rates[0] ?? null;
  const chartChange = chartStart != null ? (soraNum - chartStart).toFixed(4) : null;
  const chartChangePct = chartStart != null
    ? (((soraNum - chartStart) / chartStart) * 100).toFixed(2)
    : null;
  const highPoint   = history.reduce((a, b) => (b.rate > a.rate ? b : a), history[0] ?? { label: '—', rate: 0 });
  const lowPoint    = history.reduce((a, b) => (b.rate < a.rate ? b : a), history[0] ?? { label: '—', rate: 99 });

  const yPad   = (chartMax - chartMin) * 0.15 || 0.1;
  const yDomain = [Math.max(0, chartMin - yPad), chartMax + yPad];

  return (
    <div className="max-w-4xl mx-auto pt-4 flex flex-col gap-6">

      {/* ── Rate cards ─────────────────────────────────────────────────────── */}
      <div className="bg-bg-card border border-accent-gold/30 rounded-3xl p-8">
        <h2 className="text-3xl font-bold text-center mb-2">SORA Rates Calculator</h2>
        <p className="text-center text-text-muted mb-10">3M Compounded SORA + Adjustable Spread</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current SORA */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-8 text-center flex flex-col justify-center">
            <div className="text-sm text-text-muted mb-3">CURRENT 3M SORA</div>
            <div className="text-6xl font-bold text-accent-gold tracking-tighter">
              {loading ? '...' : soraRate !== null ? soraNum.toFixed(2) : '—'}%
            </div>
            {effectiveDate && (
              <div className="text-xs text-text-muted mt-2">{effectiveDate}</div>
            )}
            {lastUpdated && (
              <div className="text-xs text-green-400 mt-3 flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {lastUpdated.toLocaleDateString('en-SG')}
              </div>
            )}
          </div>

          {/* Spread */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-8 text-center flex flex-col justify-center">
            <div className="text-sm text-text-muted mb-3">SPREAD OVER SORA (%)</div>
            <input
              type="number"
              step="0.01"
              value={spread}
              onChange={(e) => setSpread(e.target.value)}
              className="w-full text-6xl font-bold text-center bg-transparent focus:outline-none text-accent-gold border-b border-accent-gold"
            />
          </div>

          {/* Effective rate */}
          <div className="bg-gradient-to-br from-accent-gold/10 to-bg-elevated border border-accent-gold/50 rounded-2xl p-8 text-center flex flex-col justify-center">
            <div className="text-sm text-text-muted mb-3">YOUR EFFECTIVE RATE</div>
            <div className="text-6xl font-bold text-accent-gold tracking-tighter">
              {effective}%
            </div>
          </div>
        </div>
      </div>

      {/* ── SORA Chart ─────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="bg-bg-card border border-border rounded-2xl p-6">

          {/* Chart header */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-widest mb-1">
                3M Compounded SORA — Quarterly
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold font-mono text-text-primary">
                  {soraNum.toFixed(4)}
                </span>
                {chartChange !== null && (
                  <span className={`text-lg font-mono font-semibold ${
                    parseFloat(chartChange) >= 0 ? 'text-accent-green' : 'text-accent-red'
                  }`}>
                    {parseFloat(chartChange) >= 0 ? '+' : ''}{chartChange}
                    <span className="text-sm ml-1">
                      ({parseFloat(chartChangePct) >= 0 ? '+' : ''}{chartChangePct}%)
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex gap-6 text-xs font-mono">
              <div>
                <div className="text-text-muted mb-0.5">Start</div>
                <div className="text-text-primary font-semibold">{chartStart?.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-text-muted mb-0.5">High</div>
                <div className="text-accent-green font-semibold">{highPoint.rate.toFixed(4)}</div>
                <div className="text-text-muted text-[10px]">{highPoint.label}</div>
              </div>
              <div>
                <div className="text-text-muted mb-0.5">Low</div>
                <div className="text-accent-red font-semibold">{lowPoint.rate.toFixed(4)}</div>
                <div className="text-text-muted text-[10px]">{lowPoint.label}</div>
              </div>
            </div>
          </div>

          {/* Recharts area chart */}
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="soraGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b6bc9" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3b6bc9" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />

              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--color-text-muted, #888)', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                dy={6}
              />

              <YAxis
                domain={yDomain}
                tick={{ fill: 'var(--color-text-muted, #888)', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                width={42}
                tickFormatter={(v) => v.toFixed(2)}
              />

              <Tooltip content={<SoraTooltip />} />

              {/* Start reference line */}
              {chartStart !== null && (
                <ReferenceLine
                  y={chartStart}
                  stroke="rgba(201,160,62,0.35)"
                  strokeDasharray="4 3"
                />
              )}

              <Area
                type="monotone"
                dataKey="rate"
                stroke="#ffffff"
                strokeWidth={1.5}
                fill="url(#soraGradient)"
                dot={{ fill: '#ffffff', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#c9a03e', strokeWidth: 0 }}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>

          <div className="mt-3 text-[10px] text-text-muted text-right">
            Source: PropKaki · MAS 3M Compounded SORA
          </div>
        </div>
      )}

      {/* Loading state for chart */}
      {loading && (
        <div className="bg-bg-card border border-border rounded-2xl p-6 h-48 flex items-center justify-center">
          <span className="text-text-muted text-sm animate-pulse">Loading SORA history…</span>
        </div>
      )}

    </div>
  );
}
