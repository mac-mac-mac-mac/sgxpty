// Pure helpers behind the Charts tab. No React, no hardcoded market data:
// everything is derived from the nightly-calculated fields on each REIT / stock.

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const median = (values) => {
  const v = values.filter(isNum).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** REITs that can be placed on a Yield × P/NAV map (needs both values, still paying). */
export function yieldMapPoints(reits) {
  return reits
    .filter((r) => isNum(r.yield) && isNum(r.pb) && r.distributionStatus !== 'suspended')
    .map((r) => ({
      ticker: r.ticker, name: r.shortName || r.name,
      x: r.pb, y: r.yield, growth: isNum(r.dpuGrowth) ? r.dpuGrowth : null, status: r.distributionStatus || null,
    }));
}

/** REITs that can be placed on a Yield × DPU-growth map. Growth is pinned to ±limit for display only. */
export function trapMapPoints(reits, limit = 60) {
  return reits
    .filter((r) => isNum(r.yield) && isNum(r.dpuGrowth) && r.distributionStatus !== 'suspended')
    .map((r) => ({
      ticker: r.ticker, name: r.shortName || r.name,
      x: clamp(r.dpuGrowth, -limit, limit), y: r.yield, growth: r.dpuGrowth, status: r.distributionStatus || null,
      pinned: Math.abs(r.dpuGrowth) > limit,
    }));
}

/** Tickers sitting in the yield-trap zone: above-median yield AND falling DPU. */
export function trapZone(points) {
  const medY = median(points.map((p) => p.y));
  if (medY == null) return { medY: null, names: [] };
  return { medY, names: points.filter((p) => p.growth < 0 && p.y > medY).sort((a, b) => b.y - a.y) };
}

/** One row per sector with medians (nulls ignored). */
export function sectorStats(reits) {
  const groups = new Map();
  for (const r of reits) {
    if (!r.sector) continue;
    if (!groups.has(r.sector)) groups.set(r.sector, []);
    groups.get(r.sector).push(r);
  }
  return [...groups.entries()]
    .map(([sector, rows]) => {
      const withGrowth = rows.filter((r) => isNum(r.dpuGrowth) && r.distributionStatus !== 'suspended');
      return {
        sector,
        count: rows.length,
        medYield: median(rows.filter((r) => r.distributionStatus !== 'suspended').map((r) => r.yield)), // paying REITs only
        medPb: median(rows.map((r) => r.pb)),
        medGearing: median(rows.map((r) => r.gearing)),
        growing: withGrowth.filter((r) => r.dpuGrowth >= 0).length,
        growthKnown: withGrowth.length,
        troubled: rows.filter((r) => r.distributionStatus === 'reduced' || r.distributionStatus === 'suspended').length,
      };
    })
    .sort((a, b) => (b.medYield ?? -1) - (a.medYield ?? -1));
}

/** Income names trading close to their 52-week low. */
export function nearLows(items, { withinPct = 10, minYield = 4 } = {}) {
  return items
    .filter((r) => isNum(r.price) && isNum(r.low52) && r.low52 > 0 && isNum(r.yield) && r.distributionStatus !== 'suspended')
    .map((r) => {
      const pctAboveLow = ((r.price - r.low52) / r.low52) * 100;
      const range = isNum(r.high52) && r.high52 > r.low52 ? r.high52 - r.low52 : null;
      return { ...r, pctAboveLow, position: range ? clamp((r.price - r.low52) / range, 0, 1) : null };
    })
    .filter((r) => r.pctAboveLow <= withinPct && r.yield >= minYield)
    .sort((a, b) => a.pctAboveLow - b.pctAboveLow);
}
