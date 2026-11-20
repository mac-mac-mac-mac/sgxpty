import YahooFinance from 'yahoo-finance2';
import { parseTickers, fetchQuotes, CACHE_OK, CACHE_NONE } from './_lib/quotes.js';

// GET /api/quotes?tickers=D05,O39,C38U   (max 40)
// → { quotes: { D05: {...} }, errors: { XXX: 'not_found' }, fetchedAt }
// Same-origin only: no CORS headers are sent on purpose.
export function makeHandler(yf) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'method_not_allowed' });
    }
    const parsed = parseTickers(req.query?.tickers);
    if (parsed.error) {
      res.setHeader('Cache-Control', CACHE_NONE);
      return res.status(400).json({ error: parsed.error });
    }
    try {
      const { quotes, errors } = await fetchQuotes(yf, parsed.tickers);
      if (Object.keys(quotes).length === 0) {
        res.setHeader('Cache-Control', CACHE_NONE);
        return res.status(502).json({ error: 'upstream_unavailable', errors });
      }
      res.setHeader('Cache-Control', CACHE_OK);
      return res.status(200).json({ quotes, errors, fetchedAt: new Date().toISOString() });
    } catch (err) {
      console.error('[SGXPTY] /api/quotes failed:', err);   // detail stays in the server log
      res.setHeader('Cache-Control', CACHE_NONE);
      return res.status(502).json({ error: 'upstream_unavailable' });
    }
  };
}

export default makeHandler(new YahooFinance({ suppressNotices: ['yahooSurvey'] }));
