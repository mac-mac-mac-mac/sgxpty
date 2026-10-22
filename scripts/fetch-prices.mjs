import YahooFinanceLib from 'yahoo-finance2';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const YahooFinance = new YahooFinanceLib();
const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const PRICES_OUT  = path.join(__dirname, '../src/data/prices.json');
const HISTORY_DIR = path.join(__dirname, '../src/data/history');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Tickers ───────────────────────────────────────────────────────────────────
const REIT_TICKERS = [
  'C38U','A17U','ME8U','N2IU','M44U','J69U','K71U','T82U','BUOU','SK6U',
  'M1GU','RW0U','CMOU','CJLU','UD1U','OU8U','AU8U','SV3U','J91U','BTOU',
  'T8B','OXMU','CWBU','AW9U','DHLU','LREIT','SYTU','ZACAU','EDIU','TS0U',
  'CY6U','ACV','BWCU','BARE','LIPPO','VC2','CLND','AJBU','SPHREIT',
];

const ETF_TICKERS = [
  'ES3','G3B','CLR','MBH','O9P','CFA','A35','GLD',
  'D7VY','S27','QS0','P74U','SEMI','RYZ','CNXT','UOBAM',
  'XUS','EUS','XND','XWR',
];

const TICKERS = [...REIT_TICKERS, ...ETF_TICKERS];

// ── Fetch with retry ──────────────────────────────────────────────────────────
async function fetchWithRetry(ticker, attempts = 3) {
  const symbol = ticker + '.SI';
  for (let i = 0; i < attempts; i++) {
    try {
      const quote = await YahooFinance.quote(symbol, {}, { validateResult: false });
      return quote;
    } catch (err) {
      const isRateLimit = err.message?.includes('Too Many') || err.message?.includes('429');
      if (isRateLimit && i < attempts - 1) {
        console.warn(`  Rate limited on ${symbol}, waiting ${3000 * (i + 1)}ms…`);
        await sleep(3000 * (i + 1));
        continue;
      }
      throw err;
    }
  }
}

// ── Append one row to ticker's history file ───────────────────────────────────
function appendHistory(ticker, row) {
  const file = path.join(HISTORY_DIR, `${ticker}.json`);
  let rows = [];
  if (existsSync(file)) {
    try { rows = JSON.parse(readFileSync(file, 'utf8')); } catch { rows = []; }
  }
  if (rows.some((r) => r.d === row.d)) {
    console.log(`    [history] ${ticker} already has ${row.d}, skipping`);
    return;
  }
  rows.push(row);
  writeFileSync(file, JSON.stringify(rows));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nSGXPTY Price Fetch — ${new Date().toISOString()}`);
  console.log(`Fetching ${TICKERS.length} tickers (${REIT_TICKERS.length} REITs + ${ETF_TICKERS.length} ETFs)\n`);

  mkdirSync(HISTORY_DIR, { recursive: true });

  const today  = new Date().toISOString().slice(0, 10);
  const prices = {};
  let success  = 0;
  let failed   = 0;

  for (let i = 0; i < TICKERS.length; i++) {
    const ticker = TICKERS[i];
    try {
      const quote = await fetchWithRetry(ticker);
      if (!quote) throw new Error('Empty response');

      const price    = quote.regularMarketPrice             ?? null;
      const chgPct   = quote.regularMarketChangePercent     ?? null;
      const mktCap   = quote.marketCap                      ?? null;
      const yld      = quote.trailingAnnualDividendYield
        ? +(quote.trailingAnnualDividendYield * 100).toFixed(4)
        : null;
      const pb       = quote.priceToBook                    ?? null;
      const nav      = quote.bookValue                      ?? null;

      // prices.json — used by applyLiveData() in the frontend
      prices[ticker] = {
        price,
        previousClose:   quote.regularMarketPreviousClose   ?? null,
        change:          quote.regularMarketChange           ?? null,
        changePercent:   chgPct,
        marketCap:       mktCap,
        dividendYield:   yld,
        priceToBook:     pb   != null ? +pb.toFixed(3)   : null,
        bookValue:       nav  != null ? +nav.toFixed(3)  : null,
        currency:        quote.currency                      ?? 'SGD',
        fiftyTwoWeekLow:  quote.fiftyTwoWeekLow             ?? null,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh            ?? null,
        volume:          quote.regularMarketVolume           ?? null,
        shortName:       quote.shortName ?? quote.longName  ?? ticker,
        fetchedAt:       new Date().toISOString(),
      };

      // history/{TICKER}.json — one compact row per trading day
      if (price !== null) {
        appendHistory(ticker, {
          d: today,                                          // date
          p: price,                                         // price
          y: yld,                                           // yield %
          c: chgPct != null ? +chgPct.toFixed(3) : null,   // % change
          pb: pb    != null ? +pb.toFixed(3)     : null,   // P/B
          nav: nav  != null ? +nav.toFixed(3)    : null,   // NAV
        });
      }

      success++;
      console.log(`  [${i + 1}/${TICKERS.length}] ✓ ${ticker} — ${price}`);
    } catch (err) {
      failed++;
      console.warn(`  [${i + 1}/${TICKERS.length}] ✗ ${ticker} — ${err.message}`);
    }

    if (i < TICKERS.length - 1) await sleep(2000);
  }

  writeFileSync(PRICES_OUT, JSON.stringify(prices, null, 2));
  console.log(`\nDone. ${success} succeeded, ${failed} failed.`);
  console.log(`prices.json updated · history files in src/data/history/`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
