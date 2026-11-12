What this is
SGXPTY is a client-rendered dashboard for Singapore-listed REITs, ETFs, and dividend stocks. It combines reference information maintained in the codebase with nightly-calculated market data and optional live quotes from Yahoo Finance.

Stack
Frontend: React 18 with Vite. src/main.jsx mounts the app, and src/App.jsx owns the dashboard’s main state and views.
UI and charts: Tailwind CSS styles the interface; Recharts renders charts; Lucide React provides icons.
Backend: Vercel serverless functions in api/, including api/quote.js and api/quotes-batch.js. They retrieve quotes from Yahoo Finance and return JSON.
Database: None. Persistent data is stored as JSON in the repository, such as src/data/prices.json, public/rates.json, and public/sora.json. Nightly updates write and commit those files.
Authentication: None visible. The app’s quote endpoints do not require a user login or API token.
State management: React component state and hooks in src/App.jsx and individual components. There is no global state library or server-side user state.
External APIs: Yahoo Finance for quotes, dividends, and fundamentals; FRED for US interest rates; open.er-api.com for currency rates; PropKaki for SORA data. The scheduled fetchers are in scripts/.
Infrastructure and hosting: Vercel configuration is in vercel.json; scheduled data refresh and commits are handled by GitHub Actions in .github/workflows/daily-sync.yml and .github/workflows/update-prices.yml. The repository metadata points to a Vercel-hosted site. No database or separate persistent backend service is configured in the files inspected.
How it's organized
Text
api/                  Vercel quote endpoints
data/                 Ticker mapping data
public/               Static rates and SORA JSON served to the browser
scripts/               Nightly data fetchers and calculation helpers
src/
  components/          Dashboard, tables, comparisons, charts, rates UI
  data/                Asset reference data and generated price data
  lib/                  Quote merging and analytics helpers
  utils/                Ticker normalization
.github/workflows/     Scheduled data sync workflows
How it fits together
Live quote refresh: click to UI
The user clicks Refresh. src/components/Header.jsx calls its onRefresh prop. In src/App.jsx, that prop is loadLiveData.
The app prepares the refresh. loadLiveData resets progress, creates an AbortController, and builds a ticker list from REITS, ETFS, and STOCKS imported from src/data/.
The browser requests one quote at a time. For each ticker, loadLiveData calls fetchSingleQuote in src/lib/yahooFinance.js. That function requests /api/quote?ticker=….
The serverless handler fetches the quote. Vercel routes /api/quote to api/quote.js. Its default handler adds .SI when needed, calls Yahoo Finance through fetchWithRetry, and maps the result into a compact JSON response. It returns an error status if the ticker is missing, Yahoo returns no quote, or the upstream call fails.
The browser merges the live values with the nightly data. Back in loadLiveData, the quote is saved in liveMapRef. mergeLive in src/lib/yahooFinance.js overlays selected market fields on DAILY_PRICES imported from src/data/prices.json. applyLiveData combines that data with the static REIT, ETF, and stock records, and recalculates yield and P/NAV using the current price.
React updates the display. The updated arrays are stored with setReitsData, setEtfsData, and setStocksData. src/components/DashboardTable.jsx filters, sorts, and renders the data, including live or stale price indicators. Failed ticker requests are logged and skipped; after the refresh, the app leaves nightly values in place for tickers without a successful live quote.
There is no database step in this flow: the live request goes to Yahoo Finance, while the fallback/nightly values come from the bundled JSON file.

Nightly data flow
The scheduled workflow in .github/workflows/daily-sync.yml runs scripts/update-sora.mjs, scripts/update-rates.mjs, tests, and scripts/fetch-prices.mjs. The price fetcher uses scripts/lib/calc.mjs to derive metrics, then writes src/data/prices.json and history files. The workflow commits generated JSON back to the repository. The frontend reads the rates and SORA files as static assets; the generated price JSON is imported into the app at build time.

Request lifecycle diagram
Mermaid
flowchart LR
    U[User clicks Refresh] --> H[Header.jsx onRefresh]
    H --> A[App.jsx loadLiveData]
    A --> F[src/lib/yahooFinance.js fetchSingleQuote]
    F -->|GET /api/quote?ticker=…| V[Vercel function api/quote.js]
    V --> Y[Yahoo Finance]
    Y --> V
    V -->|JSON quote or error| F
    F --> A
    A --> M[mergeLive + applyLiveData]
    D[(Bundled src/data/prices.json)] --> M
    M --> S[React state update]
    S --> T[DashboardTable.jsx renders UI]
