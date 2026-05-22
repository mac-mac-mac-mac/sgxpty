import yahooFinance from 'yahoo-finance2'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tickers } = req.body
  if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid tickers array' })
  }

  const quotes = {}
  const BATCH = 5

  for (let i = 0; i < tickers.length; i += BATCH) {
    const slice = tickers.slice(i, i + BATCH)
    await Promise.allSettled(
      slice.map(async (ticker) => {
        const symbol = ticker.endsWith('.SI') ? ticker : ticker + '.SI'
        try {
          const quote = await yahooFinance.quote(symbol, {}, { validateResult: false })
          if (!quote) return
          quotes[ticker] = {
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
          }
        } catch (err) {
          console.warn('[SGXPTY]', symbol, err.message)
        }
      })
    )
    // small delay between batches to avoid rate limiting
    if (i + BATCH < tickers.length) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  res.status(200).json({ quotes })
}
