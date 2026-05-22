import yahooFinance from 'yahoo-finance2'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  const ticker = req.query.ticker
  if (!ticker) {
    return res.status(400).json({ error: 'Missing ticker parameter' })
  }

  const symbol = ticker.endsWith('.SI') ? ticker : ticker + '.SI'

  try {
    const quote = await yahooFinance.quote(symbol, {}, { validateResult: false })

    if (!quote) {
      return res.status(404).json({ error: 'Ticker not found: ' + symbol })
    }

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
    console.error('[SGXPTY quote]', symbol, err.message)
    res.status(502).json({ error: 'Yahoo Finance unavailable: ' + err.message })
  }
}
