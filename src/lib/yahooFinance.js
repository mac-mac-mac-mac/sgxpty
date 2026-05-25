// Fetch a single ticker from the backend
export async function fetchSingleQuote(ticker) {
  const symbol = ticker.endsWith('.SI') ? ticker : ticker + '.SI'
  const res = await fetch(`/api/quote?ticker=${symbol}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

// Apply live data onto static items
export function applyLiveData(items, liveMap) {
  return items.map((item) => {
    const live = liveMap[item.ticker]
    if (!live) return item
    return {
      ...item,
      price: live.price ?? item.price,
      change: live.changePercent != null ? +live.changePercent.toFixed(2) : item.change,
      marketCap: live.marketCap ?? item.marketCap,
      yield: live.dividendYield ?? item.yield,
      currency: live.currency || item.currency,
      liveData: live,
    }
  })
}
