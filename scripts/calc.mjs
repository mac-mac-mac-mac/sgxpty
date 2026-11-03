// scripts/lib/calc.mjs
// Pure calculation helpers used by fetch-prices.mjs (no network, fully testable).
// Everything the site shows about yield, DPU growth, distribution status,
// P/NAV, P/E and gearing is derived here from raw Yahoo Finance data.

const DAY = 86_400_000;

const toMs = (d) => (d instanceof Date ? d.getTime() : typeof d === 'number' ? (d < 1e12 ? d * 1000 : d) : Date.parse(d));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export const FREQ_LABEL = { 1: 'Annual', 2: 'Semi-annual', 4: 'Quarterly', 12: 'Monthly' };

// ── Dividends ────────────────────────────────────────────────────────────────

/** Keep valid payouts, one per calendar day, sorted oldest → newest. */
export function cleanDividends(list = []) {
  const byDay = new Map();
  for (const d of list) {
    const t = toMs(d?.date);
    const amount = num(d?.amount);
    if (!Number.isFinite(t) || amount == null || amount <= 0) continue;
    byDay.set(Math.floor(t / DAY), { t, amount });
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t);
}

/** Payouts per year, inferred from the gaps between the most recent payouts. */
export function estimateFrequency(divs) {
  if (divs.length < 2) return 1;
  const recent = divs.slice(-7);
  const gaps = [];
  for (let i = 1; i < recent.length; i++) gaps.push((recent[i].t - recent[i - 1].t) / DAY);
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  const perYear = 365 / Math.max(median, 1);
  let best = 1;
  let bestDist = Infinity;
  for (const c of [1, 2, 4, 12]) {
    const dist = Math.abs(Math.log(perYear) - Math.log(c));
    if (dist < bestDist) { best = c; bestDist = dist; }
  }
  return best;
}

/** Consecutive calendar years (ending this year or last) with at least one payout. */
export function payoutStreakYears(divs, now = Date.now()) {
  const years = new Set(divs.map((d) => new Date(d.t).getUTCFullYear()));
  const nowYear = new Date(toMs(now)).getUTCFullYear();
  let y = years.has(nowYear) ? nowYear : nowYear - 1;
  let n = 0;
  while (years.has(y)) { n++; y--; }
  return n;
}

/**
 * Annual DPU, YoY growth, yield and distribution status from raw payouts.
 *  - annual DPU = sum of the last `freq` payouts (robust to window-edge timing)
 *  - growth     = that sum vs the `freq` payouts before it
 *  - suspended  = no payout for > 1.6 × the normal gap (+15 days)
 *  - reduced    = still paying but annual DPU fell ≥ 20% YoY
 */
export function dividendMetrics(rawDividends, price, now = Date.now()) {
  const empty = { status: null, dpuTtm: null, freq: null, growth: null, yield: null, lastExDate: null, payouts: 0, payYears: null };
  const divs = cleanDividends(rawDividends);
  if (divs.length === 0) return empty;

  const freq = estimateFrequency(divs);
  const last = divs[divs.length - 1];
  const daysSince = (toMs(now) - last.t) / DAY;
  const lastExDate = new Date(last.t).toISOString().slice(0, 10);
  const payouts = divs.length;
  const payYears = payoutStreakYears(divs, now);

  if (daysSince > (365 / freq) * 1.6 + 15) {
    return { status: 'suspended', dpuTtm: 0, freq, growth: -100, yield: 0, lastExDate, payouts, payYears };
  }

  const sum = (arr) => arr.reduce((a, d) => a + d.amount, 0);
  let dpuTtm;
  if (payouts >= freq) dpuTtm = sum(divs.slice(-freq));
  else dpuTtm = (sum(divs) / payouts) * freq; // new listing: annualise what we have

  let growth = null;
  if (payouts >= freq * 2) {
    const prior = sum(divs.slice(-freq * 2, -freq));
    if (prior > 0) growth = (dpuTtm / prior - 1) * 100;
  }

  const status = growth != null && growth <= -20 ? 'reduced' : 'active';
  const yld = num(price) > 0 ? (dpuTtm / price) * 100 : null;
  return { status, dpuTtm, freq, growth, yield: yld, lastExDate, payouts, payYears };
}

// ── Valuation ────────────────────────────────────────────────────────────────

/** NAV per unit ≈ Yahoo book value, only when price and accounts share a currency. */
export function navAndPb(price, bookValue, currency, financialCurrency) {
  const p = num(price);
  const bv = num(bookValue);
  if (!(p > 0) || !(bv > 0) || !currency || !financialCurrency || currency !== financialCurrency) {
    return { nav: null, pb: null };
  }
  const pb = p / bv;
  if (pb < 0.05 || pb > 10) return { nav: null, pb: null }; // implausible → scale/units problem
  return { nav: bv, pb };
}

export function peRatio(quote) {
  const pe = num(quote?.trailingPE);
  if (pe > 0) return pe;
  const eps = num(quote?.epsTrailingTwelveMonths);
  const p = num(quote?.regularMarketPrice);
  return eps > 0 && p > 0 ? p / eps : null;
}

// ── Gearing estimate ─────────────────────────────────────────────────────────

/** Find a field on a fundamentals row whatever the prefix (quarterlyTotalDebt, annualTotalDebt, totalDebt). */
function pick(row, suffix) {
  const target = suffix.toLowerCase();
  for (const key of Object.keys(row || {})) {
    if (key.toLowerCase() === target || key.toLowerCase().endsWith(target)) {
      const v = num(row[key]);
      if (v != null) return v;
    }
  }
  return null;
}

/** Estimated gearing % = total debt ÷ total assets from the latest usable balance sheet. */
export function gearingEstimate(rows = []) {
  const sorted = [...rows]
    .filter((r) => r && r.date)
    .sort((a, b) => toMs(b.date) - toMs(a.date));
  for (const r of sorted) {
    const debt = pick(r, 'TotalDebt');
    const assets = pick(r, 'TotalAssets');
    if (debt > 0 && assets > 0) {
      const g = (debt / assets) * 100;
      if (g > 0 && g < 100) return { gearing: g, asAt: new Date(toMs(r.date)).toISOString().slice(0, 10) };
    }
  }
  return { gearing: null, asAt: null };
}

// ── Assemble one prices.json entry ───────────────────────────────────────────

const r = (v, dp) => (typeof v === 'number' && Number.isFinite(v) ? +v.toFixed(dp) : null);

/**
 * Build the calculated fields for one ticker.
 * `dividends` / `balanceRows` are null when that fetch failed — those keys are then
 * omitted so the caller can keep last night's values instead of wiping them.
 */
export function buildCalculated({ quote, dividends, balanceRows, kind, now = Date.now() }) {
  const price = num(quote?.regularMarketPrice);
  const out = {};

  if (dividends) {
    const m = dividendMetrics(dividends, price, now);
    Object.assign(out, {
      dpuTtm: r(m.dpuTtm, 5),
      dpuFreq: m.freq,
      dpuGrowth: r(m.growth, 2),
      distributionStatus: m.status,
      lastExDate: m.lastExDate,
      payYears: m.payYears,
      yield: r(m.yield, 4),
    });
  }

  if (kind === 'reit') {
    const v = navAndPb(price, quote?.bookValue, quote?.currency, quote?.financialCurrency);
    out.nav = r(v.nav, 4);
    out.pb = r(v.pb, 3);
    if (balanceRows) {
      const g = gearingEstimate(balanceRows);
      out.gearing = r(g.gearing, 2);
      out.gearingAsAt = g.asAt;
    }
  }

  if (kind === 'stock') out.pe = r(peRatio(quote), 2);
  return out;
}
