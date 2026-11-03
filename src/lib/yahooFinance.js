// Live quote helper + the one place where nightly-calculated data meets the UI.
//
// prices.json (written nightly by scripts/fetch-prices.mjs) holds, per ticker:
//   price, changePercent, marketCap, currency          – market data
//   dpuTtm, dpuFreq, dpuGrowth, distributionStatus,    – calculated from dividend history
//   payYears, nav, pb, pe, gearing                     – calculated from Yahoo fundamentals
// The browser's live refresh only updates the market-data fields; yield and P/NAV are
// then RE-CALCULATED from the live price, so they stay consistent with it.

const FREQ_LABEL = { 1: 'Annual', 2: 'Semi-annual', 4: 'Quarterly', 12: 'Monthly' };
const LIVE_FIELDS = ['price', 'previousClose', 'change', 'changePercent', 'marketCap', 'currency', 'fiftyTwoWeekLow', 'fiftyTwoWeekHigh', 'volume'];

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

// Overlay live market data on the nightly dataset. Calculated fields are never overwritten.
export function mergeLive(daily = {}, live = {}) {
  const out = { ...daily }
  for (const [ticker, quote] of Object.entries(live)) {
    const patch = {}
    for (const key of LIVE_FIELDS) if (quote?.[key] != null) patch[key] = quote[key]
    out[ticker] = { ...(daily[ticker] || {}), ...patch }
  }
  return out
}

const finite = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

// Combine static identity (name, sector, ratings…) with calculated + live data.
export function applyLiveData(items, dataMap = {}) {
  return items.map((item) => {
    const d = dataMap[item.ticker]
    if (!d) return item

    const price = finite(d.price)
    const suspended = d.distributionStatus === 'suspended'
    const yieldPct = suspended
      ? 0
      : finite(d.dpuTtm) != null && price > 0
      ? (d.dpuTtm / price) * 100
      : null
    const pb = finite(d.nav) != null && price > 0 ? price / d.nav : null

    return {
      ...item,
      price,
      change: finite(d.changePercent) != null ? +d.changePercent.toFixed(2) : null,
      marketCap: finite(d.marketCap),
      currency: d.currency || null,
      yield: yieldPct,
      dpuGrowth: finite(d.dpuGrowth),
      distributionStatus: d.distributionStatus || null,
      payYears: finite(d.payYears),
      nav: finite(d.nav),
      pb,
      pe: finite(d.pe),
      gearing: finite(d.gearing),
      dividendFrequency: FREQ_LABEL[d.dpuFreq] || null,
      stale: Boolean(d.stale),
    }
  })
}
