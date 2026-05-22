import yahooFinance from 'yahoo-finance2';
import { getStore } from '@netlify/blobs';

const CACHE_KEY = 'sgx-quotes-all';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const BATCH_SIZE = 8; // concurrent requests per batch
const BATCH_DELAY_MS = 300; // pause between batches to respect rate limits

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function fetchSingleQuote(ticker) {
  const symbol = ticker.endsWith('.SI') ? ticker : `${ticker}.SI`;
  const quote = await yahooFinance.quote(symbol, {}, { validateResult: false });
  return {
    ticker,
    symbol,
    shortName: quote.shortName || quote.longName || ticker,
    price: quote.regularMarketPrice || null,
    previousClose: quote.regularMarketPreviousClose || null,
    change: quote.regularMarketChange || null,
    changePercent: quote.regularMarketChangePercent || null,
    marketCap: quote.marketCap ? Math.round(quote.marketCap / 1e6) : null,
    volume: quote.regularMarketVolume || null,
    currency: quote.currency || 'SGD',
    exchange: quote.fullExchangeName || 'SGX',
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
    dividendYield: quote.trailingAnnualDividendYield
      ? +(quote.trailingAnnualDividendYield * 100).toFixed(2)
      : null,
    bid: quote.bid || null,
    ask: quote.ask || null,
    marketState: quote.marketState || 'REGULAR',
  };
}

async function fetchInBatches(tickers) {
  const quotes = {};
  const errors = [];

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(fetchSingleQuote));

    results.forEach((result, idx) => {
      const ticker = batch[idx];
      if (result.status === 'fulfilled') {
        quotes[ticker] = result.value;
      } else {
        errors.push({ ticker, error: result.reason?.message || 'Unknown error' });
      }
    });

    // Pause between batches (skip after the last one)
    if (i + BATCH_SIZE < tickers.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return { quotes, errors };
}

export const handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let tickers;
  try {
    const body = JSON.parse(event.body || '{}');
    tickers = body.tickers;
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'tickers array required' }) };
    }
  } catch {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  // Try to serve from cache
  try {
    const store = getStore('sgx-market-cache');
    const cached = await store.get(CACHE_KEY, { type: 'json' });
    if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      const cacheAgeSeconds = Math.round((Date.now() - cached.timestamp) / 1000);
      const filtered = {};
      for (const ticker of tickers) {
        if (cached.quotes[ticker]) filtered[ticker] = cached.quotes[ticker];
      }
      return {
        statusCode: 200,
        headers: { ...HEADERS, 'X-Cache': 'HIT', 'X-Cache-Age': String(cacheAgeSeconds) },
        body: JSON.stringify({ quotes: filtered, cached: true, cacheAgeSeconds }),
      };
    }
  } catch (err) {
    console.warn('Cache read failed, fetching fresh data:', err.message);
  }

  // Fetch fresh data from Yahoo Finance
  const { quotes, errors } = await fetchInBatches(tickers);
  const fetchedCount = Object.keys(quotes).length;

  // Persist to cache if we got any results
  if (fetchedCount > 0) {
    try {
      const store = getStore('sgx-market-cache');
      await store.setJSON(CACHE_KEY, { quotes, timestamp: Date.now() });
    } catch (err) {
      console.warn('Cache write failed:', err.message);
    }
  }

  return {
    statusCode: fetchedCount > 0 ? 200 : 502,
    headers: { ...HEADERS, 'X-Cache': 'MISS' },
    body: JSON.stringify({
      quotes,
      cached: false,
      fetchedCount,
      totalRequested: tickers.length,
      errors: errors.length > 0 ? errors : undefined,
    }),
  };
};
