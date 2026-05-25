import { YahooFinance } from 'yahoo-finance2'
const yahooFinance = new YahooFinance()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchWithRetry(symbol, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const quote = await yahooFinance.quote(symbol, {}, { validateResult: false })
      return quote
    } catch (err) {
      const isRateLimit = err.message && (
        err.message.includes('Too Many Requests') ||
        err.message.includes('429')
      )
      if (isRateLimit && i < attempts - 1) {
        await sleep(2000 * (i + 1))
        continue
      }
      throw err
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()

  const ticker = req.query.ticker
  if (!ticker) return res.status(400).json({ error: 'Missing ticker' })

  const symbol = ticker.endsWith('.SI') ? ticker : ticker + '.SI'

  try {
    const quote = await fetchWithRetry(symbol)
    if (!quote) return res.status(404).json({ error: 'Not found: ' + symbol })

    res.status(200).json({
      symbol: quote.symbol || symbol,
      shortName: quote.shortName || quote.longName || ticker,
      price: quote.regularMarketPrice || null,
      previousClose: quote.regularMarketPreviousClose || null,
      change: quote.regularMarketChange || null,
      changePercent: quote.regularMarketChangePercent || null,
      marketCap: quote.marketCap || null,
      dividendYield: quote.trailingAnnualDividendYield
        ? quote.trailingAnnualDividendYield * 100
        : null,
      currency: quote.currency || 'SGD',
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
      volume: quote.regularMarketVolume || null,
      exchange: quote.fullExchangeName || 'SGX',
    })
  } catch (err) {
    console.error('[SGXPTY]', symbol, err.message)
    res.status(502).json({ error: err.message })
  }
}
