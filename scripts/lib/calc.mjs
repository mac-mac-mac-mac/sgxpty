// scripts/lib/calc.mjs
// Pure calculation helpers used by fetch-prices.mjs (no network, fully testable).
// Everything the site shows about yield, DPU growth, distribution status,
// P/NAV, P/E and gearing is derived here from raw Yahoo Finance data.

const DAY = 86_400_000;

const toMs = (d) => (d instanceof Date ? d.getTime() : typeof d === 'number' ? (d < 1e12 ? d * 1000 : d) : Date.parse(d));
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export const FREQ_LABEL = { 1: 'Annual', 2: 'Semi-annual', 4: 'Quarterly', 12: 'Monthly' };

// ── Dividends ────────────────────────────────────────────────────────────────

const CLUSTER_DAYS = 10;          // payouts this close together are ONE distribution (split components)
const WINDOW_JITTER = 20 * DAY;   // tolerance for ex-dates drifting a few days year to year
export const DPU_TOLERANCE = 0.10; // calculated annual DPU must be within 10% of Yahoo's trailing figure

/** Keep valid payouts (one per exact timestamp), sorted oldest → newest. */
export function cleanDividends(list = []) {
  const byTime = new Map();
  for (const d of list) {
    const t = toMs(d?.date);
    const amount = num(d?.amount);
    if (!Number.isFinite(t) || amount == null || amount <= 0) continue;
    byTime.set(t, { t, amount });
  }
  return [...byTime.values()].sort((a, b) => a.t - b.t);
}

/** Merge payouts within CLUSTER_DAYS of each other (a distribution reported in parts) into one event. */
export function clusterDividends(divs) {
  const out = [];
  for (const d of divs) {
    const prev = out[out.length - 1];
    if (prev && (d.t - prev.last) / DAY <= CLUSTER_DAYS) { prev.amount += d.amount; prev.last = d.t; }
    else out.push({ t: d.t, last: d.t, amount: d.amount });
  }
  return out;
}

/** Payouts per year, inferred from the gaps between the most recent distributions. */
export function estimateFrequency(events) {
  if (events.length < 2) return 1;
  const recent = events.slice(-7);
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
 *  - two date windows anchored on the latest distribution: the last year and the year before
 *  - annual DPU = sum of the last-year window
 *  - growth     = only when BOTH windows hold exactly the expected number of distributions
 *                 (a missing payout in Yahoo's data must not look like growth)
 *  - suspended  = no payout for > 1.6 × the normal gap (+15 days)
 *  - reduced    = still paying but annual DPU fell ≥ 20% YoY
 */
export function dividendMetrics(rawDividends, price, now = Date.now()) {
  const empty = { status: null, dpuTtm: null, freq: null, growth: null, yield: null, lastExDate: null, payouts: 0, payYears: null };
  const divs = cleanDividends(rawDividends);
  if (divs.length === 0) return empty;

  const events = clusterDividends(divs);
  const freq = estimateFrequency(events);
  const last = events[events.length - 1];
  const daysSince = (toMs(now) - last.last) / DAY;
  const lastExDate = new Date(last.last).toISOString().slice(0, 10);
  const payouts = events.length;
  const payYears = payoutStreakYears(divs, now);

  if (daysSince > (365 / freq) * 1.6 + 15) {
    return { status: 'suspended', dpuTtm: 0, freq, growth: -100, yield: 0, lastExDate, payouts, payYears };
  }

  const sum = (arr) => arr.reduce((a, e) => a + e.amount, 0);
  const w1 = events.filter((e) => e.t > last.t - 365 * DAY + WINDOW_JITTER && e.t <= last.t);
  const w2 = events.filter((e) => e.t > last.t - 730 * DAY + WINDOW_JITTER && e.t <= last.t - 365 * DAY + WINDOW_JITTER);

  let dpuTtm;
  if (w1.length === freq) dpuTtm = sum(w1);
  else if (w1.length > freq) dpuTtm = sum(events.slice(-freq));
  else dpuTtm = (sum(w1) / w1.length) * freq; // fewer than expected (new listing / gap) → annualise

  let growth = null;
  if (w1.length === freq && w2.length === freq) {
    const prior = sum(w2);
    if (prior > 0) growth = (dpuTtm / prior - 1) * 100;
  }

  const status = growth != null && growth <= -20 ? 'reduced' : 'active';
  const yld = num(price) > 0 ? (dpuTtm / price) * 100 : null;
  return { status, dpuTtm, freq, growth, yield: yld, lastExDate, payouts, payYears };
}

/** Yahoo's own trailing 12-month dividend per unit — used only as an independent cross-check. */
export function trailingDps(quote, price) {
  const rate = num(quote?.trailingAnnualDividendRate);
  if (rate != null) return rate;
  const y = num(quote?.trailingAnnualDividendYield);
  return y != null && num(price) > 0 ? y * price : null;
}

/** 'ok' | 'mismatch' | 'unchecked' */
export function reconcile(calc, ref, status) {
  if (calc == null || ref == null) return 'unchecked';
  if (ref === 0) return calc === 0 || status === 'suspended' ? 'ok' : 'mismatch';
  return Math.abs(calc - ref) / ref <= DPU_TOLERANCE ? 'ok' : 'mismatch';
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
    const ref = trailingDps(quote, price);
    const check = reconcile(m.dpuTtm, ref, m.status);
    if (check === 'mismatch') {
      // Our payout maths and Yahoo disagree → publish nothing rather than a wrong number
      Object.assign(out, {
        dpuTtm: null, dpuFreq: m.freq, dpuGrowth: null, distributionStatus: null,
        lastExDate: m.lastExDate, payYears: m.payYears, yield: null,
        dpuCheck: 'mismatch', dpuTtmCalc: r(m.dpuTtm, 5), dpuTtmYahoo: r(ref, 5),
      });
    } else {
      Object.assign(out, {
        dpuTtm: r(m.dpuTtm, 5),
        dpuFreq: m.freq,
        dpuGrowth: r(m.growth, 2),
        distributionStatus: m.status,
        lastExDate: m.lastExDate,
        payYears: m.payYears,
        yield: r(m.yield, 4),
        dpuCheck: check,
      });
    }
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
