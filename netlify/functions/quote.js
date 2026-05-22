import yahooFinance from 'yahoo-finance2';

export const handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const ticker = event.queryStringParameters && event.queryStringParameters.ticker;
  if (!ticker) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing ticker parameter' }),
    };
  }

  const symbol = ticker.endsWith('.SI') ? ticker : `${ticker}.SI`;

  try {
    const quote = await yahooFinance.quote(symbol, {}, { validateResult: false });

    const result = {
      ticker,
      symbol,
      shortName: quote.shortName || quote.longName || ticker,
      price: quote.regularMarketPrice || null,
      previousClose: quote.regularMarketPreviousClose || null,
      change: quote.regularMarketChange || null,
      changePercent: quote.regularMarketChangePercent || null,
      marketCap: quote.marketCap ? Math.round(quote.marketCap / 1e6) : null,
      volume: quote.regularMarketVolume || null,
      currency: quote.currency || 'SGD',
      exchange: quote.fullExchangeName || 'SGX',
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
      dividendYield: quote.trailingAnnualDividendYield
        ? +(quote.trailingAnnualDividendYield * 100).toFixed(2)
        : null,
      bid: quote.bid || null,
      ask: quote.ask || null,
      marketState: quote.marketState || 'REGULAR',
    };

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch quote', message: err.message }),
    };
  }
};
