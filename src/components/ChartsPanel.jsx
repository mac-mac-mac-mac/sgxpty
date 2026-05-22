import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useMemo } from 'react';

const CHART_COLORS = [
  '#c9a84c', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899',
  '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16', '#14b8a6',
];

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const CustomTooltipStyle = {
  backgroundColor: '#161616',
  border: '1px solid #2a2a2a',
  borderRadius: '6px',
  fontSize: '11px',
  color: '#f0f0f0',
};

function CustomTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={CustomTooltipStyle} className="px-3 py-2 shadow-xl">
      <p className="font-semibold text-text-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}{suffix}</strong>
        </p>
      ))}
    </div>
  );
}

function SectorYieldChart({ reits }) {
  const data = useMemo(() => {
    const grouped = {};
    reits.forEach((r) => {
      if (!r.sector || !r.yield) return;
      if (!grouped[r.sector]) grouped[r.sector] = { sum: 0, count: 0 };
      grouped[r.sector].sum += r.yield;
      grouped[r.sector].count += 1;
    });
    return Object.entries(grouped)
      .map(([sector, { sum, count }]) => ({
        sector: sector.length > 12 ? sector.slice(0, 11) + '…' : sector,
        yield: +(sum / count).toFixed(2),
      }))
      .sort((a, b) => b.yield - a.yield);
  }, [reits]);

  return (
    <ChartCard title="Average Yield by Sector" subtitle="Based on trailing dividend yield">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
          <XAxis
            dataKey="sector"
            tick={{ fill: '#606060', fontSize: 10 }}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fill: '#606060', fontSize: 10 }} unit="%" />
          <Tooltip content={<CustomTooltip suffix="%" />} />
          <Bar dataKey="yield" fill="#c9a84c" radius={[3, 3, 0, 0]} name="Avg Yield" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function SubsectorPieChart({ reits }) {
  const data = useMemo(() => {
    const grouped = {};
    reits.forEach((r) => {
      const key = r.subsector || r.sector || 'Other';
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name: name.length > 22 ? name.slice(0, 21) + '…' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [reits]);

  return (
    <ChartCard title="REIT Sub-Sector Breakdown" subtitle="Number of REITs per sub-sector">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            outerRadius={90}
            innerRadius={48}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val, name) => [`${val} REITs`, name]}
            contentStyle={CustomTooltipStyle}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', color: '#a0a0a0' }}
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function CurrencyExposureChart({ reits }) {
  const data = useMemo(() => {
    const grouped = {};
    reits.forEach((r) => {
      const c = r.currency || 'SGD';
      grouped[c] = (grouped[c] || 0) + (r.marketCap || 0);
    });
    const total = Object.values(grouped).reduce((a, b) => a + b, 0);
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: +(value / total * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value);
  }, [reits]);

  return (
    <ChartCard title="Currency Exposure" subtitle="% of total market cap by currency">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            outerRadius={90}
            innerRadius={48}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(val) => [`${val}%`]}
            contentStyle={CustomTooltipStyle}
          />
          <Legend wrapperStyle={{ fontSize: '10px', color: '#a0a0a0' }} iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ETFCategoryChart({ etfs }) {
  const data = useMemo(() => {
    const grouped = {};
    etfs.forEach((e) => {
      const key = e.category || 'Other';
      grouped[key] = (grouped[key] || 0) + (e.aum || 0);
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [etfs]);

  return (
    <ChartCard title="ETF Asset Allocation" subtitle="Total AUM (M) by category">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
          <XAxis dataKey="name" tick={{ fill: '#606060', fontSize: 10 }} />
          <YAxis tick={{ fill: '#606060', fontSize: 10 }} />
          <Tooltip
            formatter={(val) => [`$${val.toLocaleString()}M`]}
            contentStyle={CustomTooltipStyle}
          />
          <Bar dataKey="value" name="AUM (M)" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function GearingDistributionChart({ reits }) {
  const data = useMemo(() => {
    const buckets = {
      '< 30%': 0,
      '30–35%': 0,
      '35–40%': 0,
      '40–45%': 0,
      '> 45%': 0,
    };
    reits.forEach((r) => {
      if (r.gearing == null) return;
      if (r.gearing < 30) buckets['< 30%']++;
      else if (r.gearing < 35) buckets['30–35%']++;
      else if (r.gearing < 40) buckets['35–40%']++;
      else if (r.gearing < 45) buckets['40–45%']++;
      else buckets['> 45%']++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [reits]);

  return (
    <ChartCard title="Gearing Distribution" subtitle="Number of REITs per gearing band">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
          <XAxis dataKey="name" tick={{ fill: '#606060', fontSize: 10 }} />
          <YAxis tick={{ fill: '#606060', fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            formatter={(val) => [`${val} REITs`]}
            contentStyle={CustomTooltipStyle}
          />
          <Bar dataKey="value" name="REITs" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => {
              const color =
                entry.name === '< 30%' ? '#22c55e' :
                entry.name === '30–35%' ? '#84cc16' :
                entry.name === '35–40%' ? '#f59e0b' :
                entry.name === '40–45%' ? '#f97316' : '#ef4444';
              return <Cell key={i} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default function ChartsPanel({ reits, etfs }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-text-primary">Market Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectorYieldChart reits={reits} />
        <SubsectorPieChart reits={reits} />
        <CurrencyExposureChart reits={reits} />
        <ETFCategoryChart etfs={etfs} />
        <GearingDistributionChart reits={reits} />
      </div>
    </section>
  );
}
