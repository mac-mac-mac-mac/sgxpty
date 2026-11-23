import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTickers, fetchQuotes, toQuote, MAX_TICKERS } from '../../api/_lib/quotes.js';
import { makeHandler as makeQuotes } from '../../api/quotes.js';

const q = (symbol, extra = {}) => ({ symbol, shortName: symbol, regularMarketPrice: 1.5, regularMarketChangePercent: 0.4, currency: 'SGD', marketCap: 1e9, ...extra });
const fakeYf = (fn) => { const f = { calls: [], quote: async (...a) => { f.calls.push(a); return fn(...a); } }; return f; };
const mockRes = () => { const r = { code: 200, headers: {}, body: undefined, setHeader(k, v) { r.headers[k] = v; }, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };

test('parseTickers: normalises case, .SI, commas, repeated params, duplicates', () => {
  assert.deepEqual(parseTickers('d05.si, O39 ,d05').tickers, ['D05', 'O39']);
  assert.deepEqual(parseTickers(['D05,O39', 'c38u']).tickers, ['D05', 'O39', 'C38U']);
});
test('parseTickers: rejects empty, malformed and oversized input', () => {
  for (const bad of [undefined, '', ',,', '../etc', 'D05;DROP', 'A B', 'TOOLONGTICKER', '<script>']) assert.ok(parseTickers(bad).error, `should reject ${bad}`);
  assert.equal(parseTickers(Array.from({ length: MAX_TICKERS + 1 }, (_, i) => `A${i}`)).error, 'too_many_tickers');
  assert.equal(parseTickers(Array.from({ length: MAX_TICKERS }, (_, i) => `A${i}`)).tickers.length, MAX_TICKERS);
});

test('toQuote keeps a real zero change (old code turned 0 into null)', () => {
  assert.equal(toQuote(q('D05.SI', { regularMarketChangePercent: 0, regularMarketChange: 0 }), 'D05').changePercent, 0);
});

test('fetchQuotes: ONE upstream call for the whole list, with .SI symbols; partial results are normal', async () => {
  const yf = fakeYf(() => [q('D05.SI'), q('O39.SI', { regularMarketPrice: null })]);   // C38U missing, O39 has no price
  const { quotes, errors } = await fetchQuotes(yf, ['D05', 'O39', 'C38U']);
  assert.equal(yf.calls.length, 1);
  assert.deepEqual(yf.calls[0][0], ['D05.SI', 'O39.SI', 'C38U.SI']);
  assert.deepEqual(Object.keys(quotes), ['D05']);
  assert.deepEqual(errors, { O39: 'no_price', C38U: 'not_found' });
});
test('fetchQuotes: ignores symbols nobody asked for', async () => {
  const { quotes } = await fetchQuotes(fakeYf(() => [q('D05.SI'), q('EVIL.SI')]), ['D05']);
  assert.deepEqual(Object.keys(quotes), ['D05']);
});
test('fetchQuotes: retries once on a rate limit, then gives up', async () => {
  let n = 0;
  const flaky = fakeYf(() => { if (n++ === 0) throw new Error('Too Many Requests'); return [q('D05.SI')]; });
  assert.deepEqual(Object.keys((await fetchQuotes(flaky, ['D05'], { retryDelayMs: 1 })).quotes), ['D05']);
  const dead = fakeYf(() => { throw new Error('Too Many Requests'); });
  await assert.rejects(fetchQuotes(dead, ['D05'], { retryDelayMs: 1 }));
  assert.equal(dead.calls.length, 2);
});
test('fetchQuotes: a hung upstream times out', async () => {
  await assert.rejects(fetchQuotes(fakeYf(() => new Promise(() => {})), ['D05'], { timeoutMs: 30 }), /upstream_timeout/);
});

test('/api/quotes: success → 200, per-ticker errors, CDN cache header, and NO CORS header', async () => {
  const res = mockRes();
  await makeQuotes(fakeYf(() => [q('D05.SI')]))({ method: 'GET', query: { tickers: 'D05,ZZZ' } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body.errors, { ZZZ: 'not_found' });
  assert.match(res.headers['Cache-Control'], /s-maxage=45/);
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
  assert.ok(Date.parse(res.body.fetchedAt));
});
test('/api/quotes: bad input → 400, wrong method → 405, nothing reaches Yahoo', async () => {
  const yf = fakeYf(() => []); const h = makeQuotes(yf);
  for (const tickers of [undefined, 'a/b', Array.from({ length: 50 }, (_, i) => `A${i}`).join(',')]) {
    const res = mockRes(); await h({ method: 'GET', query: { tickers } }, res); assert.equal(res.code, 400);
  }
  const post = mockRes(); await h({ method: 'POST', query: { tickers: 'D05' } }, post); assert.equal(post.code, 405);
  assert.equal(yf.calls.length, 0);
});
test('/api/quotes: upstream failure → generic 502, provider text never reaches the client, not cached', async () => {
  const logged = []; const orig = console.error; console.error = (...a) => logged.push(a);
  try {
    const res = mockRes();
    await makeQuotes(fakeYf(() => { throw new Error('secret provider detail: crumb 12345'); }))({ method: 'GET', query: { tickers: 'D05' } }, res);
    assert.equal(res.code, 502);
    assert.deepEqual(res.body, { error: 'upstream_unavailable' });
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.ok(logged.length === 1 && String(logged[0].join(' ')).includes('secret provider detail')); // detail stays in the server log
  } finally { console.error = orig; }
});
test('/api/quotes: every ticker missing → 502 with the per-ticker reasons (not cached)', async () => {
  const res = mockRes(); await makeQuotes(fakeYf(() => []))({ method: 'GET', query: { tickers: 'AAA,BBB' } }, res);
  assert.equal(res.code, 502); assert.deepEqual(res.body.errors, { AAA: 'not_found', BBB: 'not_found' });
});

