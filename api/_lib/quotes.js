// Shared logic for the quote endpoints. No framework code here, so it can be unit-tested
// with a fake Yahoo client (files under api/_lib are not exposed as routes by Vercel).

export const MAX_TICKERS = 40;                 // per request — keeps one upstream call small
const TICKER_RE = /^[A-Z0-9]{1,6}$/;            // SGX codes: D05, 8C8U, CRPU, 9CI …
const UPSTREAM_TIMEOUT_MS = 4500;               // stay inside a 10 s function limit even with one retry

/** Accepts "D05,O39", ["D05.SI","O39"], or a repeated query param. Returns { tickers } or { error }. */
export function parseTickers(raw) {
  const parts = [].concat(raw ?? []).flatMap((v) => String(v).slice(0, 600).split(','));
  const tickers = [...new Set(parts.map((s) => s.trim().toUpperCase().replace(/\.SI$/, '')).filter(Boolean))];
  if (tickers.length === 0) return { error: 'missing_tickers' };
  if (tickers.length > MAX_TICKERS) return { error: 'too_many_tickers' };
  if (!tickers.every((t) => TICKER_RE.test(t))) return { error: 'invalid_ticker' };
  return { tickers };
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Public shape of one quote. A real 0 (e.g. 0.00% change) stays 0 instead of becoming null. */
export function toQuote(q, ticker) {
  const y = num(q.trailingAnnualDividendYield);
  return {
    symbol: q.symbol || `${ticker}.SI`,
    shortName: q.shortName || q.longName || ticker,
    price: num(q.regularMarketPrice),
    previousClose: num(q.regularMarketPreviousClose),
    change: num(q.regularMarketChange),
    changePercent: num(q.regularMarketChangePercent),
    marketCap: num(q.marketCap),
    dividendYield: y != null ? y * 100 : null,
    currency: q.currency || 'SGD',
    fiftyTwoWeekLow: num(q.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: num(q.fiftyTwoWeekHigh),
    volume: num(q.regularMarketVolume),
    exchange: q.fullExchangeName || 'SGX',
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('upstream_timeout')), ms))]);

async function callUpstream(yf, symbols, retryDelayMs, timeoutMs) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await withTimeout(yf.quote(symbols, {}, { validateResult: false }), timeoutMs);
    } catch (err) {
      const rateLimited = /Too Many Requests|429/.test(err?.message || '');
      if (rateLimited && attempt === 0) { await sleep(retryDelayMs); continue; }
      throw err;
    }
  }
}

/**
 * One upstream request for the whole list.
 * Returns { quotes: {TICKER: quote}, errors: {TICKER: 'not_found' | 'no_price'} } — a partial result is a normal result.
 * Throws only when the upstream call itself fails (the caller turns that into a generic 502).
 */
export async function fetchQuotes(yf, tickers, { retryDelayMs = 800, timeoutMs = UPSTREAM_TIMEOUT_MS } = {}) {
  const result = await callUpstream(yf, tickers.map((t) => `${t}.SI`), retryDelayMs, timeoutMs);
  const list = Array.isArray(result) ? result : result ? [result] : [];
  const quotes = {};
  const errors = {};
  for (const q of list) {
    const t = String(q?.symbol || '').replace(/\.SI$/, '').toUpperCase();
    if (!tickers.includes(t)) continue;
    const quote = toQuote(q, t);
    if (quote.price == null) errors[t] = 'no_price';
    else quotes[t] = quote;
  }
  for (const t of tickers) if (!quotes[t] && !errors[t]) errors[t] = 'not_found';
  return { quotes, errors };
}

// CDN caching: many visitors refreshing within the window cost one upstream call, not one each.
export const CACHE_OK = 'public, s-maxage=45, stale-while-revalidate=60';
export const CACHE_NONE = 'no-store';
