const BATCH_URL = '/api/quotes-batch';

export async function fetchQuotes(tickers) {
  const res = await fetch(BATCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tickers }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.quotes || {};
}

export function applyLiveData(items, liveMap) {
  return items.map((item) => {
    const live = liveMap[item.ticker];
    if (!live) return item;
    return {
      ...item,
      price: live.price ?? item.price,
      change: live.changePercent != null ? +live.changePercent.toFixed(2) : item.change,
      marketCap: live.marketCap ?? item.marketCap,
      yield: live.dividendYield ?? item.yield,
      currency: live.currency || item.currency,
      liveData: live,
    };
  });
}
