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
// Covers: price, change, marketCap, yield, currency, pb, nav
export function applyLiveData(items, liveMap) {
  return items.map((item) => {
    const live = liveMap[item.ticker]
    if (!live) return item
    return {
      ...item,
      price:     live.price                != null ? live.price                          : item.price,
      change:    live.changePercent        != null ? +live.changePercent.toFixed(2)      : item.change,
      marketCap: live.marketCap            != null ? live.marketCap                      : item.marketCap,
      yield:     live.dividendYield        != null ? live.dividendYield                  : item.yield,
      pb:        live.priceToBook          != null ? +live.priceToBook.toFixed(3)        : item.pb,
      nav:       live.bookValue            != null ? +live.bookValue.toFixed(3)          : item.nav,
      currency:  live.currency             || item.currency,
      liveData:  live,
    }
  })
}
