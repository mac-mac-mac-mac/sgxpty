import { useMemo, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Cell, LabelList,
} from 'recharts';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import PNavBadge from './PNavBadge';
import GearingPill from './GearingPill';
import {
  median, yieldMapPoints, trapMapPoints, trapZone, sectorStats, nearLows, sortRows, firstDir,
} from '../lib/analytics';

const GREEN = '#22c55e';
const RED = '#ef4444';
const AMBER = '#f59e0b';
const GOLD = '#c9a84c';
const MUTED = '#8a8a8a';
const GRID = 'rgba(255,255,255,0.06)';
const AXIS = { fill: '#8a8a8a', fontSize: 11 };

const growthColor = (g) => (g == null ? MUTED : g >= 0 ? GREEN : RED);
const fmt = (v, dp = 2, suffix = '') => (v != null && Number.isFinite(v) ? v.toFixed(dp) + suffix : '—');

function ChartCard({ title, subtitle, children, footer }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
      {footer && <div className="text-[11px] text-text-muted leading-relaxed">{footer}</div>}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
      {items.map(([color, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}

function PointTooltip({ active, payload, xLabel }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-bg-elevated border border-border rounded px-3 py-2 text-xs shadow-lg">
      <div className="font-mono font-bold text-accent-gold">{p.ticker} <span className="font-sans font-normal text-text-secondary">{p.name}</span></div>
      <div className="mt-1 grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 font-mono">
        <span className="text-text-muted">Yield</span><span>{fmt(p.y, 2, '%')}</span>
        <span className="text-text-muted">{xLabel}</span><span>{xLabel === 'P/NAV' ? fmt(p.x, 2, 'x') : fmt(p.growth, 1, '%')}</span>
        {xLabel === 'P/NAV' && (<><span className="text-text-muted">DPU growth</span><span style={{ color: growthColor(p.growth) }}>{fmt(p.growth, 1, '%')}</span></>)}
        {p.status && (<><span className="text-text-muted">Status</span><span className="capitalize">{p.status}</span></>)}
      </div>
    </div>
  );
}

// ── 1. Yield × P/NAV ──────────────────────────────────────────────────────────
function YieldValueMap({ points }) {
  const medX = median(points.map((p) => p.x));
  const medY = median(points.map((p) => p.y));
  const maxX = Math.max(1.3, ...points.map((p) => p.x)) * 1.05;
  const maxY = Math.max(...points.map((p) => p.y)) * 1.1;
  if (points.length < 3) return <p className="text-xs text-text-muted py-10 text-center">Not enough REITs with a verified yield and P/NAV yet.</p>;
  return (
    <>
      <Legend items={[[GREEN, 'DPU rising'], [RED, 'DPU falling'], [MUTED, 'DPU trend unknown']]} />
      <ResponsiveContainer width="100%" height={380} initialDimension={{ width: 720, height: 380 }}>
        <ScatterChart margin={{ top: 26, right: 24, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis type="number" dataKey="x" domain={[0, maxX]} tick={AXIS} tickFormatter={(v) => v.toFixed(1) + 'x'} stroke="#333"
            label={{ value: 'Price / NAV  (left = cheaper)', position: 'insideBottom', offset: -14, fill: MUTED, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" domain={[0, maxY]} tick={AXIS} tickFormatter={(v) => v.toFixed(0) + '%'} stroke="#333" width={44}
            label={{ value: 'Yield', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 11 }} />
          <ZAxis range={[70, 70]} />
          <ReferenceArea x1={0} x2={medX} y1={medY} y2={maxY} fill={GREEN} fillOpacity={0.05}
            label={{ value: 'Cheaper + higher yield', position: 'insideTopLeft', fill: GREEN, fontSize: 10, opacity: 0.8 }} />
          <ReferenceLine x={1} stroke={AMBER} strokeDasharray="4 3" strokeOpacity={0.6}
            label={{ value: 'at NAV', position: 'top', fill: AMBER, fontSize: 10 }} />
          <ReferenceLine x={medX} stroke={MUTED} strokeDasharray="2 4" strokeOpacity={0.6} />
          <ReferenceLine y={medY} stroke={MUTED} strokeDasharray="2 4" strokeOpacity={0.6} />
          <Tooltip content={<PointTooltip xLabel="P/NAV" />} cursor={{ strokeDasharray: '3 3', stroke: '#444' }} />
          <Scatter data={points} isAnimationActive={false}>
            {points.map((p) => <Cell key={p.ticker} fill={growthColor(p.growth)} fillOpacity={0.85} />)}
            <LabelList dataKey="ticker" position="top" style={{ fontSize: 9, fill: '#9a9a9a' }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </>
  );
}

// ── 2. Yield-trap map ─────────────────────────────────────────────────────────
function YieldTrapMap({ points, limit }) {
  const { medY, names } = trapZone(points);
  const maxY = Math.max(...points.map((p) => p.y)) * 1.1;
  if (points.length < 3) return <p className="text-xs text-text-muted py-10 text-center">Not enough REITs with a verified yield and DPU growth yet.</p>;
  return (
    <>
      <Legend items={[[GREEN, 'Active'], [AMBER, 'Reduced'], [MUTED, 'Status unknown']]} />
      <ResponsiveContainer width="100%" height={380} initialDimension={{ width: 720, height: 380 }}>
        <ScatterChart margin={{ top: 26, right: 24, bottom: 24, left: 4 }}>
          <CartesianGrid stroke={GRID} />
          <XAxis type="number" dataKey="x" domain={[-(limit + 12), limit + 12]} ticks={[-limit, -limit / 2, 0, limit / 2, limit]} tick={AXIS}
            tickFormatter={(v) => (v > 0 ? '+' : '') + v + '%'} stroke="#333" allowDataOverflow
            label={{ value: 'DPU growth, year on year', position: 'insideBottom', offset: -14, fill: MUTED, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" domain={[0, maxY]} tick={AXIS} tickFormatter={(v) => v.toFixed(0) + '%'} stroke="#333" width={44}
            label={{ value: 'Yield', angle: -90, position: 'insideLeft', fill: MUTED, fontSize: 11 }} />
          <ZAxis range={[70, 70]} />
          <ReferenceArea x1={-(limit + 12)} x2={0} y1={medY} y2={maxY} fill={RED} fillOpacity={0.07}
            label={{ value: 'Yield-trap zone', position: 'insideTopLeft', fill: RED, fontSize: 10, opacity: 0.85 }} />
          <ReferenceLine x={0} stroke={MUTED} strokeOpacity={0.7} />
          <ReferenceLine y={medY} stroke={MUTED} strokeDasharray="2 4" strokeOpacity={0.6} />
          <Tooltip content={<PointTooltip xLabel="DPU growth" />} cursor={{ strokeDasharray: '3 3', stroke: '#444' }} />
          <Scatter data={points} isAnimationActive={false}>
            {points.map((p) => <Cell key={p.ticker} fill={p.status === 'reduced' ? AMBER : p.status === 'active' ? GREEN : MUTED} fillOpacity={0.85} />)}
            <LabelList dataKey="ticker" position="top" style={{ fontSize: 9, fill: '#9a9a9a' }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="text-xs">
        <span className="text-text-muted">In the trap zone now: </span>
        {names.length === 0
          ? <span className="text-text-secondary">none — no above-median yield is paired with a falling DPU.</span>
          : names.map((p, i) => (
              <span key={p.ticker}>
                <span className="font-mono text-accent-gold">{p.ticker}</span>
                <span className="text-text-muted"> ({fmt(p.y, 1, '%')}, {fmt(p.growth, 1, '%')})</span>
                {i < names.length - 1 ? ', ' : ''}
              </span>
            ))}
      </div>
    </>
  );
}

// ── Sortable table plumbing ───────────────────────────────────────────────────
const TH = 'px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-text-primary transition-colors';
const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };

function useSort(defaultKey, defaultDir) {
  const [sort, setSort] = useState({ key: defaultKey, dir: defaultDir });
  const onSort = (key, rows) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: firstDir(rows, key) }));
  return [sort, onSort];
}

function SortTh({ label, col, sort, onSort, rows, align = 'right' }) {
  const active = sort.key === col;
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th className={`${TH} ${ALIGN[align]}`} onClick={() => onSort(col, rows)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className={`w-3 h-3 ${active ? 'text-accent-gold' : 'opacity-30'}`} />
      </span>
    </th>
  );
}

// ── 3. Sector scorecard ───────────────────────────────────────────────────────
function SectorScorecard({ rows }) {
  const data = useMemo(() => rows.map((r) => ({ ...r, growingShare: r.growthKnown ? r.growing / r.growthKnown : null })), [rows]);
  const [sort, onSort] = useSort('medYield', 'desc');
  const sorted = useMemo(() => sortRows(data, sort.key, sort.dir), [data, sort]);
  const h = (label, col, align = 'right') => <SortTh label={label} col={col} sort={sort} onSort={onSort} rows={data} align={align} />;
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full text-sm min-w-[620px]">
        <thead>
          <tr className="bg-bg-elevated border-b border-border">
            {h('Sector', 'sector', 'left')}
            {h('REITs', 'count')}
            {h('Median yield', 'medYield')}
            {h('Median P/NAV', 'medPb', 'center')}
            {h('Median gearing (est.)', 'medGearing', 'center')}
            {h('DPU rising', 'growingShare')}
            {h('Cut / suspended', 'troubled')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => (
            <tr key={s.sector} className={`border-b border-border/50 ${i % 2 ? 'bg-bg-secondary/40' : ''}`}>
              <td className="px-3 py-2.5 font-medium">{s.sector}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs text-text-secondary">{s.count}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-accent-gold">{fmt(s.medYield, 2, '%')}</td>
              <td className="px-3 py-2.5 text-center"><PNavBadge pb={s.medPb} /></td>
              <td className="px-3 py-2.5 text-center"><GearingPill gearing={s.medGearing} /></td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">
                {s.growthKnown ? <span className={s.growing / s.growthKnown >= 0.5 ? 'text-accent-green' : 'text-accent-red'}>{s.growing} of {s.growthKnown}</span> : <span className="text-text-muted">—</span>}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">
                <span className={s.troubled ? 'text-accent-red' : 'text-text-muted'}>{s.troubled}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 4. Near 52-week lows ──────────────────────────────────────────────────────
function Pills({ label, options, value, onChange, suffix }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-text-muted mr-1">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
            value === o
              ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
              : 'text-text-secondary border border-border hover:text-text-primary'
          }`}
        >
          {o}{suffix}
        </button>
      ))}
    </div>
  );
}

function RangeBar({ position }) {
  if (position == null) return <span className="text-text-muted">—</span>;
  return (
    <div className="relative w-20 h-1.5 rounded-full bg-border mx-auto" title={`${Math.round(position * 100)}% of the 52-week range`}>
      <span className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent-gold" style={{ left: `calc(${position * 100}% - 4px)` }} />
    </div>
  );
}

function NearLowsList({ items }) {
  const [withinPct, setWithinPct] = useState(5);
  const [minYield, setMinYield] = useState(6);
  const found = useMemo(() => nearLows(items, { withinPct, minYield }).map((r) => ({ ...r, label: r.shortName || r.name })), [items, withinPct, minYield]);
  const [sort, onSort] = useSort('pctAboveLow', 'asc');
  const rows = useMemo(() => sortRows(found, sort.key, sort.dir), [found, sort]);
  const h = (label, col, align = 'right') => <SortTh label={label} col={col} sort={sort} onSort={onSort} rows={found} align={align} />;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Pills label="Within" options={[2, 5, 10, 15]} value={withinPct} onChange={setWithinPct} suffix="% of low" />
        <Pills label="Yield at least" options={[4, 5, 6, 7]} value={minYield} onChange={setMinYield} suffix="%" />
        <span className="text-xs text-text-muted ml-auto">{found.length} {found.length === 1 ? 'name' : 'names'}</span>
      </div>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="bg-bg-elevated border-b border-border">
              {h('Ticker', 'ticker', 'left')}
              {h('Name', 'label', 'left')}
              {h('Price', 'price')}
              {h('52w low', 'low52')}
              {h('Above low', 'pctAboveLow')}
              {h('52w range', 'position', 'center')}
              {h('Yield', 'yield')}
              {h('P/NAV', 'pb', 'center')}
              {h('DPU growth', 'dpuGrowth')}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.ticker} className={`border-b border-border/50 ${i % 2 ? 'bg-bg-secondary/40' : ''}`}>
                <td className="px-3 py-2.5 font-mono text-xs font-bold text-accent-gold">{r.ticker}</td>
                <td className="px-3 py-2.5 text-xs max-w-[180px] truncate" title={r.name}>
                  {r.shortName || r.name}
                  <span className="ml-1.5 text-[10px] text-text-muted">{r.sector && !r.subsector ? 'Stock' : 'REIT'}</span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">{fmt(r.price, r.price < 1 ? 3 : 2)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-text-secondary">{fmt(r.low52, r.low52 < 1 ? 3 : 2)}</td>
                <td className={`px-3 py-2.5 text-right font-mono text-xs ${r.pctAboveLow <= 0.5 ? 'text-accent-red font-semibold' : 'text-text-primary'}`}>
                  {r.pctAboveLow <= 0.05 ? 'at low' : '+' + r.pctAboveLow.toFixed(1) + '%'}
                </td>
                <td className="px-3 py-2.5"><RangeBar position={r.position} /></td>
                <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-accent-gold">{fmt(r.yield, 2, '%')}</td>
                <td className="px-3 py-2.5 text-center">{r.subsector ? <PNavBadge pb={r.pb} /> : <span className="text-text-muted">—</span>}</td>
                <td className={`px-3 py-2.5 text-right font-mono text-xs ${r.dpuGrowth == null ? 'text-text-muted' : r.dpuGrowth < 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                  {r.dpuGrowth == null ? '—' : (r.dpuGrowth > 0 ? '+' : '') + r.dpuGrowth.toFixed(1) + '%'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-text-muted text-sm">Nothing is within {withinPct}% of its 52-week low with a yield of at least {minYield}%.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export default function ChartsPanel({ reits = [], stocks = [] }) {
  const yieldPoints = useMemo(() => yieldMapPoints(reits), [reits]);
  const trapPoints = useMemo(() => trapMapPoints(reits, 60), [reits]);
  const sectors = useMemo(() => sectorStats(reits), [reits]);
  const incomeNames = useMemo(() => [...reits, ...stocks], [reits, stocks]);
  const paying = reits.filter((r) => r.distributionStatus !== 'suspended').length;
  const pinned = trapPoints.filter((p) => p.pinned).length;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Market Analytics</h2>

      <ChartCard
        title="Yield vs Price / NAV"
        subtitle="Which REITs pay more for less? Top-left is cheaper and higher-yielding than the typical REIT."
        footer={<>
          Dashed grey lines are the median of the REITs shown. {yieldPoints.length} of {paying} paying REITs plotted — the rest have no verified yield or NAV yet.
          Book value is Yahoo's, so treat P/NAV as an approximation of reported NAV.
        </>}
      >
        <YieldValueMap points={yieldPoints} />
      </ChartCard>

      <ChartCard
        title="Yield-trap map"
        subtitle="A high yield only helps if the payout holds. Left of the line, DPU is shrinking."
        footer={<>
          Dashed line = median yield. {trapPoints.length} of {paying} paying REITs plotted (those with a verified DPU history).
          {pinned > 0 && <> {pinned} {pinned === 1 ? 'value is' : 'values are'} beyond ±60% and pinned to the edge; the tooltip shows the real figure.</>}
        </>}
      >
        <YieldTrapMap points={trapPoints} limit={60} />
      </ChartCard>

      <ChartCard
        title="Sector scorecard"
        subtitle="Medians across each sector's REITs — yield counts paying REITs only."
      >
        <SectorScorecard rows={sectors} />
      </ChartCard>

      <ChartCard
        title="Income names near their 52-week low"
        subtitle="REITs and dividend stocks trading close to the bottom of their one-year range, with a yield worth the wait."
        footer="Cheap can be cheap for a reason — check DPU growth before buying. Suspended payers are excluded."
      >
        <NearLowsList items={incomeNames} />
      </ChartCard>
    </div>
  );
}
