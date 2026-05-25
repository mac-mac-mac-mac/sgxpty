import YahooFinance from 'yahoo-finance2'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const yahooFinance = new YahooFinance()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT = path.join(__dirname, '../src/data/prices.json')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TICKERS = [
  'C38U','A17U','N2IU','ME8U','M44U','AJBU','T82U','J69U','BUOU','K71U',
  'C2PU','HMN','J85','SK6U','P40U','TS0U','Q5T','ACV','JYEU','J91U',
  'O5RU','M1GU','DCRU','DHLU','CWBU','UD1U','CMOU','OXMU','BTOU',
  'ODBU','BWCU','CRPU','AW9U','AU8U','CY6U',
  'ES3','G3B','A35','CFA','SRT','HST','MBH','CLR',
]

async function fetchWithRetry(ticker, attempts = 3) {
  const symbol = ticker.endsWith('.SI') ? ticker : ticker + '.SI'
  for (let i = 0; i < attempts; i++) {
    try {
      const quote = await yahooFinance.quote(symbol, {}, { validateResult: false })
      return { ticker, quote }
    } catch (err) {
      const isRateLimit = err.message &&
        (err.message.includes('Too Many') || err.message.includes('429'))
      if (isRateLimit && i < attempts - 1) {
        console.warn(`  Rate limited on ${symbol}, waiting ${3000 * (i + 1)}ms...`)
        await sleep(3000 * (i + 1))
        continue
      }
      throw err
    }
  }
}

async function main() {
  console.log(`\nSGXPTY Price Fetch — ${new Date().toISOString()}`)
  console.log(`Fetching ${TICKERS.length} tickers with 2s delay between each\n`)

  const prices = {}
  let success = 0
  let failed = 0

  for (let i = 0; i < TICKERS.length; i++) {
    const ticker = TICKERS[i]
    try {
      const { quote } = await fetchWithRetry(ticker)
      if (!quote) throw new Error('Empty response')
      prices[ticker] = {
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
        shortName: quote.shortName || quote.longName || ticker,
        fetchedAt: new Date().toISOString(),
      }
      success++
      console.log(`  [${i + 1}/${TICKERS.length}] ✓ ${ticker} — ${prices[ticker].price}`)
    } catch (err) {
      failed++
      console.warn(`  [${i + 1}/${TICKERS.length}] ✗ ${ticker} — ${err.message}`)
    }
    if (i < TICKERS.length - 1) await sleep(2000)
  }

  writeFileSync(OUTPUT, JSON.stringify(prices, null, 2))
  console.log(`\nDone. ${success} succeeded, ${failed} failed.`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
