import test from 'node:test';
import assert from 'node:assert/strict';
import { dividendMetrics, navAndPb, gearingEstimate, peRatio, estimateFrequency, cleanDividends } from '../lib/calc.mjs';

const NOW = Date.parse('2026-10-30');
const d = (iso, amount) => ({ date: new Date(iso), amount });
const approx = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} !≈ ${b}`);

// Quarterly payer, DPU rising: last 4 = 0.03*4 = 0.12 ; prior 4 = 0.025*4 = 0.10
const quarterlyUp = [
  d('2024-11-15', 0.025), d('2025-02-14', 0.025), d('2025-05-15', 0.025), d('2025-08-14', 0.025),
  d('2025-11-14', 0.03),  d('2026-02-13', 0.03),  d('2026-05-14', 0.03),  d('2026-08-13', 0.03),
];

test('quarterly growing payer', () => {
  const m = dividendMetrics(quarterlyUp, 2.0, NOW);
  assert.equal(m.freq, 4);
  assert.equal(m.status, 'active');
  approx(m.dpuTtm, 0.12, 1e-9);
  approx(m.growth, 20, 1e-6);
  approx(m.yield, 6.0, 1e-6);
  assert.equal(m.lastExDate, '2026-08-13');
});

test('result does not jump when the window edge moves a few days', () => {
  const a = dividendMetrics(quarterlyUp, 2.0, NOW);
  const b = dividendMetrics(quarterlyUp, 2.0, NOW + 5 * 86_400_000);
  approx(a.growth, b.growth, 1e-9);
  approx(a.dpuTtm, b.dpuTtm, 1e-12);
});

test('semi-annual payer detected', () => {
  const semi = [d('2024-03-01', 0.1), d('2024-09-01', 0.1), d('2025-03-01', 0.1), d('2025-09-01', 0.1), d('2026-03-01', 0.09), d('2026-09-01', 0.09)];
  const m = dividendMetrics(semi, 3.0, NOW);
  assert.equal(m.freq, 2);
  approx(m.dpuTtm, 0.18, 1e-9);
  approx(m.growth, -10, 1e-6);
  assert.equal(m.status, 'active');
});

test('big cut is flagged reduced', () => {
  const cut = [
    d('2024-11-15', 0.04), d('2025-02-14', 0.04), d('2025-05-15', 0.04), d('2025-08-14', 0.04),
    d('2025-11-14', 0.02), d('2026-02-13', 0.02), d('2026-05-14', 0.02), d('2026-08-13', 0.02),
  ];
  const m = dividendMetrics(cut, 1.0, NOW);
  assert.equal(m.status, 'reduced');
  approx(m.growth, -50, 1e-6);
});

test('stopped paying → suspended, yield 0, growth -100', () => {
  const stopped = [d('2023-02-01', 0.02), d('2023-05-01', 0.02), d('2023-08-01', 0.02), d('2023-11-01', 0.02), d('2024-02-01', 0.01)];
  const m = dividendMetrics(stopped, 0.1, NOW);
  assert.equal(m.status, 'suspended');
  assert.equal(m.yield, 0);
  assert.equal(m.growth, -100);
});

test('no dividend history → everything null (not 0)', () => {
  const m = dividendMetrics([], 5, NOW);
  assert.equal(m.status, null);
  assert.equal(m.yield, null);
  assert.equal(m.growth, null);
});

test('new listing with 2 payouts is annualised, growth unknown', () => {
  const fresh = [d('2026-02-10', 0.02), d('2026-05-12', 0.02), d('2026-08-11', 0.02)];
  const m = dividendMetrics(fresh, 1.0, NOW);
  assert.equal(m.freq, 4);
  approx(m.dpuTtm, 0.08, 1e-9);
  assert.equal(m.growth, null);
});

test('junk rows are ignored, duplicate days collapsed', () => {
  const rows = cleanDividends([{ date: 'x', amount: 1 }, { date: new Date('2026-01-01'), amount: -1 }, d('2026-01-01', 0.1), d('2026-01-01', 0.1)]);
  assert.equal(rows.length, 1);
});

test('P/NAV only when currencies match and value is plausible', () => {
  assert.deepEqual(navAndPb(1.1, 1.6, 'SGD', 'SGD').nav, 1.6);
  approx(navAndPb(1.1, 1.6, 'SGD', 'SGD').pb, 0.6875, 1e-9);
  assert.equal(navAndPb(1.1, 1.6, 'SGD', 'USD').pb, null);
  assert.equal(navAndPb(1.1, 1.6, 'SGD', undefined).pb, null);
  assert.equal(navAndPb(1.1, 0.001, 'SGD', 'SGD').pb, null);
});

test('P/E prefers trailingPE, falls back to price ÷ EPS', () => {
  assert.equal(peRatio({ trailingPE: 11.2 }), 11.2);
  approx(peRatio({ regularMarketPrice: 10, epsTrailingTwelveMonths: 0.5 }), 20, 1e-9);
  assert.equal(peRatio({ epsTrailingTwelveMonths: -1, regularMarketPrice: 10 }), null);
});

test('gearing from latest usable balance sheet, any field prefix', () => {
  const rows = [
    { date: new Date('2025-12-31'), quarterlyTotalDebt: 1500, quarterlyTotalAssets: 4000 },
    { date: new Date('2026-06-30'), quarterlyTotalDebt: 1600, quarterlyTotalAssets: 4000 },
    { date: new Date('2026-09-30') }, // newest row is empty → skipped
  ];
  const g = gearingEstimate(rows);
  approx(g.gearing, 40, 1e-9);
  assert.equal(g.asAt, '2026-06-30');
  assert.equal(gearingEstimate([{ date: new Date(), totalDebt: 5000, totalAssets: 4000 }]).gearing, null); // >100% rejected
  assert.equal(gearingEstimate([]).gearing, null);
});

test('frequency estimate on monthly payer', () => {
  const monthly = Array.from({ length: 8 }, (_, i) => d(new Date(Date.UTC(2026, i, 15)).toISOString(), 0.01));
  assert.equal(estimateFrequency(cleanDividends(monthly)), 12);
});

import { buildCalculated } from '../lib/calc.mjs';

test('buildCalculated: REIT gets yield, growth, status, nav/pb, gearing', () => {
  const out = buildCalculated({
    kind: 'reit', now: NOW,
    quote: { regularMarketPrice: 2.0, bookValue: 2.5, currency: 'SGD', financialCurrency: 'SGD' },
    dividends: quarterlyUp,
    balanceRows: [{ date: new Date('2026-06-30'), quarterlyTotalDebt: 1600, quarterlyTotalAssets: 4000 }],
  });
  assert.equal(out.yield, 6);
  assert.equal(out.dpuGrowth, 20);
  assert.equal(out.distributionStatus, 'active');
  assert.equal(out.nav, 2.5);
  assert.equal(out.pb, 0.8);
  assert.equal(out.gearing, 40);
  assert.equal(out.pe, undefined);
});

test('buildCalculated: failed fetches are omitted, not zeroed', () => {
  const out = buildCalculated({ kind: 'reit', now: NOW, quote: { regularMarketPrice: 2.0 }, dividends: null, balanceRows: null });
  assert.equal('yield' in out, false);
  assert.equal('gearing' in out, false);
  assert.equal(out.pb, null); // known-unknown (no book value) is null
});

test('buildCalculated: stock gets P/E, ETF gets only dividend fields', () => {
  const s = buildCalculated({ kind: 'stock', now: NOW, quote: { regularMarketPrice: 74, trailingPE: 11.2 }, dividends: quarterlyUp });
  assert.equal(s.pe, 11.2);
  const e = buildCalculated({ kind: 'etf', now: NOW, quote: { regularMarketPrice: 5 }, dividends: [] });
  assert.equal(e.yield, null);
  assert.equal('pe' in e, false);
  assert.equal('gearing' in e, false);
});

import { payoutStreakYears } from '../lib/calc.mjs';

test('payout streak counts consecutive years, breaks on a gap', () => {
  const rows = [2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => d(`${y}-06-01`, 0.1));
  assert.equal(payoutStreakYears(cleanDividends(rows), NOW), 6);           // 2021–2026
  const annualNotYetThisYear = [2022, 2023, 2024, 2025].map((y) => d(`${y}-03-01`, 0.1));
  assert.equal(payoutStreakYears(cleanDividends(annualNotYetThisYear), NOW), 4); // 2026 not paid yet
  const stale = [2019, 2020, 2021].map((y) => d(`${y}-03-01`, 0.1));
  assert.equal(payoutStreakYears(cleanDividends(stale), NOW), 0);          // stopped → no live streak
});

test('dividendMetrics exposes payYears', () => {
  assert.equal(dividendMetrics(quarterlyUp, 2, NOW).payYears, 3); // payouts in 2024, 2025, 2026
});
