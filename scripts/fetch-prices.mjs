// scripts/fetch-prices.mjs
// Nightly job: fetch quotes + dividend history + balance sheets from Yahoo Finance,
// CALCULATE yield / DPU growth / distribution status / P/NAV / P/E / gearing estimate,
// and write src/data/prices.json plus one compact history row per ticker.

import YahooFinanceLib from 'yahoo-finance2';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { buildCalculated, cleanDividends } from './lib/calc.mjs';

const yf = new YahooFinanceLib({ suppressNotices: ['yahooSurvey'] });
const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const PRICES_OUT  = path.join(__dirname, '../src/data/prices.json');
const HISTORY_DIR = path.join(__dirname, '../src/data/history');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const YEAR_MS = 365 * 86_400_000;

// ── Tickers ───────────────────────────────────────────────────────────────────
const REIT_TICKERS = [
  'XZL','O5RU','M1GU','BMGU','A17U','HMN','AU8U','CY6U','C38U','J85',
  '8C8U','DHLU','DCRU','MXNU','9A4U','Q5T','AW9U','J69U','BUOU','UD1U',
  'AJBU','K71U','CMOU','JYEU','D5IU','BTOU','ME8U','M44U','N2IU','NTDU',
  'TS0U','C2PU','OXMU','CRPU','P40U','SET','T82U','UIBU','ODBU',
];
const STOCK_TICKERS = [
  'D05','O39','U11','Z74','G13','BS6','S63','BN4','J36','S68',
  '9CI','H78','C6L','U96','F34',
];
const ETF_TICKERS = [
  'ES3','G3B','GAB','O9A','S27','D07','XUS','EUS','XND','XWR',
  'H1N','A93','ICM','YLD','ESG','UPD','SQQ','LCS','SUN','SCY',
  'CXT','CXS','JK8','YYY','HST','EVS','SRT','CFA','CLR','BYJ',
  'GRN','A35','MBH','O9P','N6M','CYC','MMS','O87',
];

const JOBS = [
  ...REIT_TICKERS.map((t) => ({ ticker: t, kind: 'reit' })),
  ...STOCK_TICKERS.map((t) => ({ ticker: t, kind: 'stock' })),
  ...ETF_TICKERS.map((t) => ({ ticker: t, kind: 'etf' })),
];

// ── Helpers ───────────────────────────────────────────────────────────────────
async function withRetry(fn, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const rateLimited = /Too Many|429/.test(err?.message || '');
      if (rateLimited && i < attempts - 1) { await sleep(3000 * (i + 1)); continue; }
      throw err;
    }
  }
}

function loadPrevious() {
  try { return JSON.parse(readFileSync(PRICES_OUT, 'utf8')); } catch { return {}; }
}

function appendHistory(ticker, row) {
  const file = path.join(HISTORY_DIR, `${ticker}.json`);
  let rows = [];
  if (existsSync(file)) { try { rows = JSON.parse(readFileSync(file, 'utf8')); } catch { rows = []; } }
  if (rows.some((x) => x.d === row.d)) return;
  rows.push(row);
  writeFileSync(file, JSON.stringify(rows));
}

const asArray = (divs) => (Array.isArray(divs) ? divs : divs && typeof divs === 'object' ? Object.values(divs) : []);

// Calculated keys we carry over from last night when a sub-fetch fails
const DIVIDEND_KEYS = ['dpuTtm', 'dpuFreq', 'dpuGrowth', 'distributionStatus', 'lastExDate', 'payYears', 'yield', 'dpuCheck'];
const GEARING_KEYS  = ['gearing', 'gearingAsAt'];
const pickKeys = (obj = {}, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));

// ── One ticker ────────────────────────────────────────────────────────────────
async function fetchOne({ ticker, kind }, prev) {
  const symbol = ticker + '.SI';
  const notes = [];

  const quote = await withRetry(() => yf.quote(symbol, {}, { validateResult: false }));
  if (!quote || quote.regularMarketPrice == null) throw new Error('Empty response');

  // Dividend history (all kinds)
  let dividends = null;
  try {
    await sleep(800);
    const chart = await withRetry(() =>
      yf.chart(symbol, { period1: new Date(Date.now() - 25 * YEAR_MS), interval: '1mo', events: 'div' }, { validateResult: false }));
    dividends = asArray(chart?.events?.dividends);
  } catch (err) { notes.push(`dividends: ${err.message}`); }

  // Balance sheet → gearing estimate (REITs only)
  let balanceRows = null;
  if (kind === 'reit') {
    try {
      await sleep(800);
      balanceRows = await withRetry(() =>
        yf.fundamentalsTimeSeries(symbol, { period1: new Date(Date.now() - 3 * YEAR_MS), type: 'quarterly', module: 'balance-sheet' }, { validateResult: false }));
    } catch (err) { notes.push(`balance sheet: ${err.message}`); }
  }

  const calc = buildCalculated({ quote, dividends, balanceRows, kind });
  if (calc.dpuCheck === 'mismatch' && dividends) {
    const tail = cleanDividends(dividends).slice(-8).map((x) => `${new Date(x.t).toISOString().slice(0, 10)}:${x.amount}`).join(' ');
    notes.push(`DPU mismatch (calc ${calc.dpuTtmCalc} vs Yahoo ${calc.dpuTtmYahoo}) — raw events: ${tail}`);
  }
  const carried = {
    ...(dividends ? {} : pickKeys(prev, DIVIDEND_KEYS)),
    ...(balanceRows || kind !== 'reit' ? {} : pickKeys(prev, GEARING_KEYS)),
  };

  const trailing = quote.trailingAnnualDividendYield ? quote.trailingAnnualDividendYield * 100 : null;
  const entry = {
    price: quote.regularMarketPrice ?? null,
    previousClose: quote.regularMarketPreviousClose ?? null,
    change: quote.regularMarketChange ?? null,
    changePercent: quote.regularMarketChangePercent ?? null,
    marketCap: quote.marketCap ?? null,
    currency: quote.currency ?? null,
    financialCurrency: quote.financialCurrency ?? null,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
    volume: quote.regularMarketVolume ?? null,
    shortName: quote.shortName ?? quote.longName ?? ticker,
    ...carried,
    ...calc,
    yahooYield: trailing != null ? +trailing.toFixed(4) : null, // reference only — used for sanity checks
    fetchedAt: new Date().toISOString(),
  };
  return { entry, notes };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nSGXPTY Nightly Calc — ${new Date().toISOString()}`);
  console.log(`${JOBS.length} tickers (${REIT_TICKERS.length} REITs, ${STOCK_TICKERS.length} stocks, ${ETF_TICKERS.length} ETFs)\n`);

  mkdirSync(HISTORY_DIR, { recursive: true });
  const previous = loadPrevious();
  const today = new Date().toISOString().slice(0, 10);
  const prices = {};
  const failed = [];
  const warnings = [];

  for (let i = 0; i < JOBS.length; i++) {
    const job = JOBS[i];
    const tag = `[${i + 1}/${JOBS.length}] ${job.ticker}`;
    try {
      const { entry, notes } = await fetchOne(job, previous[job.ticker]);
      prices[job.ticker] = entry;

      appendHistory(job.ticker, {
        d: today,
        p: entry.price,
        y: entry.yield != null ? +entry.yield.toFixed(2) : null,
        c: entry.changePercent != null ? +entry.changePercent.toFixed(3) : null,
      });

      if (entry.yield != null && entry.yahooYield != null && Math.abs(entry.yield - entry.yahooYield) > 1.5) {
        warnings.push(`${job.ticker}: calculated yield ${entry.yield.toFixed(2)}% vs Yahoo trailing ${entry.yahooYield.toFixed(2)}%`);
      }
      const bits = [`${entry.price}`];
      if (entry.yield != null) bits.push(`yield ${entry.yield.toFixed(2)}%`);
      if (entry.dpuGrowth != null) bits.push(`DPU ${entry.dpuGrowth >= 0 ? '+' : ''}${entry.dpuGrowth.toFixed(1)}%`);
      if (entry.distributionStatus) bits.push(entry.distributionStatus);
      if (entry.payYears) bits.push(`${entry.payYears}y payouts`);
      if (entry.pb != null) bits.push(`P/NAV ${entry.pb.toFixed(2)}`);
      if (entry.gearing != null) bits.push(`gearing~${entry.gearing.toFixed(1)}%`);
      if (entry.pe != null) bits.push(`P/E ${entry.pe.toFixed(1)}`);
      console.log(`  ${tag} ✓ ${bits.join(' · ')}${notes.length ? `  ⚠ ${notes.join('; ')}` : ''}`);
    } catch (err) {
      failed.push(job.ticker);
      if (previous[job.ticker]) prices[job.ticker] = { ...previous[job.ticker], stale: true };
      console.warn(`  ${tag} ✗ ${err.message}${previous[job.ticker] ? ' (kept last good values, marked stale)' : ''}`);
    }
    if (i < JOBS.length - 1) await sleep(1500);
  }

  const ok = JOBS.length - failed.length;
  if (ok === 0) { console.error('\nEvery fetch failed — leaving prices.json untouched.'); process.exit(1); }

  writeFileSync(PRICES_OUT, JSON.stringify(prices, null, 2));

  // ── Coverage report: how much of the dashboard is actually calculable ──────
  const cov = (kind, key) => {
    const list = JOBS.filter((j) => j.kind === kind).map((j) => prices[j.ticker]).filter(Boolean);
    return `${list.filter((p) => p[key] != null).length}/${list.length}`;
  };
  console.log('\n── Coverage (non-empty / total) ─────────────────────────');
  console.log(`  REITs   yield ${cov('reit', 'yield')} · DPU growth ${cov('reit', 'dpuGrowth')} · status ${cov('reit', 'distributionStatus')} · P/NAV ${cov('reit', 'pb')} · gearing ${cov('reit', 'gearing')}`);
  console.log(`  Stocks  yield ${cov('stock', 'yield')} · DPU growth ${cov('stock', 'dpuGrowth')} · P/E ${cov('stock', 'pe')}`);
  console.log(`  ETFs    yield ${cov('etf', 'yield')}`);
  const check = (k) => JOBS.map((j) => prices[j.ticker]?.dpuCheck).filter((v) => v === k).length;
  console.log(`  DPU cross-check vs Yahoo: ok ${check('ok')} · above ${check('above')} (published; calc 10-40% over Yahoo) · mismatch ${check('mismatch')} (published as —) · unchecked ${check('unchecked')}`);
  const mism = JOBS.filter((j) => prices[j.ticker]?.dpuCheck === 'mismatch').map((j) => j.ticker);
  if (mism.length) console.log(`  Mismatched tickers: ${mism.join(', ')}`);
  const noGearing = REIT_TICKERS.filter((t) => prices[t] && prices[t].gearing == null);
  const noPb = REIT_TICKERS.filter((t) => prices[t] && prices[t].pb == null);
  if (noGearing.length) console.log(`  REITs without gearing estimate: ${noGearing.join(', ')}`);
  if (noPb.length) console.log(`  REITs without P/NAV: ${noPb.join(', ')}`);
  if (warnings.length) { console.log('\n── Yield cross-check (calc vs Yahoo) ─────────────────────'); warnings.forEach((w) => console.log('  ⚠ ' + w)); }

  console.log(`\nDone. ${ok} fetched, ${failed.length} failed${failed.length ? ` (${failed.join(', ')})` : ''}.`);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
