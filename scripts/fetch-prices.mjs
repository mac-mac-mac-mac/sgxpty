import YahooFinanceLib from 'yahoo-finance2';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const YahooFinance = new YahooFinanceLib();
const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const PRICES_OUT  = path.join(__dirname, '../src/data/prices.json');
const HISTORY_DIR = path.join(__dirname, '../src/data/history');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── All 39 verified SGX REITs ─────────────────────────────────────────────────
const REIT_TICKERS = [
  'XZL','O5RU','M1GU','BMGU','A17U','HMN','AU8U','CY6U','C38U','J85',
  '8C8U','DHLU','DCRU','MXNU','9A4U','Q5T','AW9U','J69U','BUOU','UD1U',
  'AJBU','K71U','CMOU','JYEU','D5IU','BTOU','ME8U','M44U','N2IU','NTDU',
  'TS0U','C2PU','OXMU','CRPU','P40U','SET','T82U','UIBU','ODBU',
];

// ── 38 SGX-listed ETFs ────────────────────────────────────────────────────────
const ETF_TICKERS = [
  'ES3','G3B','GAB','O9A','S27','D07','XUS','EUS','XND','XWR',
  'H1N','A93','ICM','YLD','ESG','UPD','SQQ','LCS','SUN','SCY',
  'CXT','CXS','JK8','YYY','HST','EVS','SRT','CFA','CLR','BYJ',
  'GRN','A35','MBH','O9P','N6M','CYC','MMS','O87',
];

const TICKERS = [...REIT_TICKERS, ...ETF_TICKERS];

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

      const price  = quote.regularMarketPrice          ?? null;
      const chgPct = quote.regularMarketChangePercent  ?? null;
      const mktCap = quote.marketCap                   ?? null;
      const yld    = quote.trailingAnnualDividendYield
        ? +(quote.trailingAnnualDividendYield * 100).toFixed(4)
        : null;

      prices[ticker] = {
        price,
        previousClose:  quote.regularMarketPreviousClose ?? null,
        change:         quote.regularMarketChange         ?? null,
        changePercent:  chgPct,
        marketCap:      mktCap,
        dividendYield:  yld,
        currency:       quote.currency                    ?? 'SGD',
        fiftyTwoWeekLow:  quote.fiftyTwoWeekLow           ?? null,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh          ?? null,
        volume:         quote.regularMarketVolume          ?? null,
        shortName:      quote.shortName ?? quote.longName  ?? ticker,
        fetchedAt:      new Date().toISOString(),
      };

      if (price !== null) {
        appendHistory(ticker, {
          d: today,
          p: price,
          y: yld,
          c: chgPct != null ? +chgPct.toFixed(3) : null,
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
