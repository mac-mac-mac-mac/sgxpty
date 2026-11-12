import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import DashboardTable from './components/DashboardTable';
import ViewToggle from './components/ViewToggle';
import ComparePanel from './components/ComparePanel';
import ChartsPanel from './components/ChartsPanel';
import IntelligencePanel from './components/IntelligencePanel';
import RatesPanel from './components/RatesPanel';
import Footer from './components/Footer';
import { REITS, SECTORS } from './data/reits';
import { ETFS, ETF_CATEGORIES } from './data/etfs';
import { STOCKS, STOCK_SECTORS } from './data/stocks';
import { fetchSingleQuote, applyLiveData, mergeLive, etaSeconds, formatDuration } from './lib/yahooFinance';
import DAILY_PRICES from './data/prices.json';

const MODES = [
  { id: 'reits', label: 'REITs' },
  { id: 'etfs', label: 'ETFs' },
  { id: 'stocks', label: 'Stocks' },
];

function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-bg-elevated border border-border rounded-lg">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${
            mode === m.id
              ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mode, setMode] = useState('reits'); // 'reits' | 'etfs' | 'stocks'
  const [view, setView] = useState('yield'); // REIT table view: 'yield' | 'valuation'

  const hasDailyPrices = Object.keys(DAILY_PRICES).length > 0;
  const [reitsData, setReitsData]   = useState(() => applyLiveData(REITS, DAILY_PRICES));
  const [etfsData, setEtfsData]     = useState(() => applyLiveData(ETFS, DAILY_PRICES));
  const [stocksData, setStocksData] = useState(() => applyLiveData(STOCKS, DAILY_PRICES));
  const [liveStatus, setLiveStatus] = useState(hasDailyPrices ? 'daily' : 'loading');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [search, setSearch] = useState({ reits: '', etfs: '', stocks: '' });
  const [sector, setSector] = useState({ reits: 'All', etfs: 'All', stocks: 'All' });

  const [compareList, setCompareList] = useState([]);
  const [liveCount, setLiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [processed, setProcessed] = useState(0);   // tickers attempted so far (success or fail)
  const [startedAt, setStartedAt] = useState(null);
  const [lastLiveAt, setLastLiveAt] = useState(null);
  const abortRef = useRef(null);
  const liveMapRef = useRef({});

  const loadLiveData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    liveMapRef.current = {};
    setLiveCount(0);
    setProcessed(0);
    setStartedAt(Date.now());
    setIsRefreshing(true);
    setLiveStatus('loading');

    const allTickers = [...REITS, ...ETFS, ...STOCKS].map((x) => x.ticker);
    setTotalCount(allTickers.length);

    let loaded = 0;
    for (let i = 0; i < allTickers.length; i++) {
      if (controller.signal.aborted) break;
      const ticker = allTickers[i];
      try {
        liveMapRef.current[ticker] = { ...(await fetchSingleQuote(ticker)), liveAt: Date.now() };
        loaded++;
        setLiveCount(loaded);

        // Live price on top of the nightly dataset; yield and P/NAV are re-calculated from it
        const merged = mergeLive(DAILY_PRICES, liveMapRef.current);
        setReitsData(applyLiveData(REITS, merged));
        setEtfsData(applyLiveData(ETFS, merged));
        setStocksData(applyLiveData(STOCKS, merged));

        if (loaded === 1) setLiveStatus('live');
      } catch (err) {
        console.warn(`[SGXPTY] ${ticker}:`, err.message);
      }
      setProcessed(i + 1);
      // 1.5s gap between requests — stays under Yahoo's rate limit
      if (i < allTickers.length - 1 && !controller.signal.aborted) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    if (!controller.signal.aborted) {
      setIsRefreshing(false);
      if (loaded === 0) setLiveStatus(hasDailyPrices ? 'daily' : 'fallback');
      else setLastLiveAt(new Date());
    }
  }, [hasDailyPrices]);

  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

  // Deep link support for #rates
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'rates') setActiveTab('rates');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function handleCompareToggle(item) {
    setCompareList((prev) => {
      const exists = prev.find((c) => c.ticker === item.ticker);
      if (exists) return prev.filter((c) => c.ticker !== item.ticker);
      if (prev.length >= 2) return prev;
      return [...prev, item];
    });
  }

  function handleCompareRemove(item) {
    setCompareList((prev) => prev.filter((c) => c.ticker !== item.ticker));
  }

  const dataByMode    = { reits: reitsData, etfs: etfsData, stocks: stocksData };
  const sectorsByMode = { reits: SECTORS, etfs: ETF_CATEGORIES, stocks: STOCK_SECTORS };
  const subtitleByMode = {
    reits: `${reitsData.length} S-REITs & Property Trusts`,
    etfs: `${etfsData.length} ETFs listed on SGX`,
    stocks: `${stocksData.length} STI Dividend Stocks`,
  };

  const eta = etaSeconds(processed, totalCount, startedAt);
  const etaLabel = eta == null ? 'estimating time left…' : eta === 0 ? 'almost done' : `about ${formatDuration(eta)} left`;

  function handleModeChange(next) {
    setMode(next);
    setCompareList([]); // compare list is per asset type
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        liveStatus={liveStatus}
        onRefresh={loadLiveData}
        isRefreshing={isRefreshing}
        tabs={[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'compare', label: 'Compare' },
          { id: 'filters', label: 'Five Filters' },
          { id: 'charts', label: 'Charts' },
          { id: 'rates', label: 'Rates' },
          { id: 'legacy', label: 'Legacy' },
        ]}
      />

      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold text-text-accent">SGX Market Dashboard</h1>
                <p className="text-xs text-text-muted mt-0.5">{subtitleByMode[mode]}</p>
              </div>
              <ModeToggle mode={mode} onChange={handleModeChange} />
            </div>

            {/* Live data banner */}
            {isRefreshing && totalCount > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-500/5 border border-blue-500/20 rounded text-xs text-blue-400">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Updating live prices — {processed} of {totalCount}
                </span>
                <div className="flex-1 basis-24 min-w-24 sm:max-w-72 h-1.5 bg-blue-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${(processed / totalCount) * 100}%` }}
                  />
                </div>
                <span className="font-mono">{Math.round((processed / totalCount) * 100)}%</span>
                <span className="text-text-muted">{etaLabel}</span>
                <span className="hidden sm:inline text-text-muted">Tables show last close and update as prices arrive.</span>
              </div>
            )}
            {!isRefreshing && liveStatus === 'live' && (
              <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2 bg-accent-green/5 border border-accent-green/20 rounded text-xs text-accent-green">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                  Live prices loaded{lastLiveAt ? ` at ${lastLiveAt.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}` : ''} — {liveCount} of {totalCount} prices updated{liveCount < totalCount ? `, ${totalCount - liveCount} still on last close` : ''}<span className="hidden sm:inline">; yield and P/NAV recalculated on the live price</span>
                </div>
                <button onClick={loadLiveData} className="underline hover:text-green-300 transition-colors shrink-0">
                  Refresh again →
                </button>
              </div>
            )}
            {liveStatus === 'daily' && (
              <div className="flex items-center justify-between px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded text-xs text-blue-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Showing last close<span className="hidden sm:inline"> — yield, DPU growth, distribution status, P/NAV and gearing are calculated nightly</span>
                </div>
                <button onClick={loadLiveData} className="underline hover:text-blue-300 transition-colors">
                  Refresh for live prices →
                </button>
              </div>
            )}
            {liveStatus === 'fallback' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded text-xs text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                No market data available yet — run the nightly sync
              </div>
            )}

            {compareList.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-accent-gold/5 border border-accent-gold/20 rounded text-xs">
                <span className="text-accent-gold font-medium">Compare:</span>
                {compareList.map((item) => (
                  <span key={item.ticker} className="font-mono text-accent-gold bg-accent-gold/10 px-2 py-0.5 rounded border border-accent-gold/30">
                    {item.ticker}
                  </span>
                ))}
                {compareList.length === 2 && (
                  <button
                    onClick={() => setActiveTab('compare')}
                    className="ml-2 text-text-secondary hover:text-text-primary underline"
                  >
                    View comparison →
                  </button>
                )}
              </div>
            )}

            {mode === 'reits' && <ViewToggle view={view} onViewChange={setView} />}

            <DashboardTable
              data={dataByMode[mode]}
              mode={mode}
              view={view}
              search={search[mode]}
              onSearchChange={(v) => setSearch((s) => ({ ...s, [mode]: v }))}
              sectorFilter={sector[mode]}
              onSectorFilter={(v) => setSector((s) => ({ ...s, [mode]: v }))}
              sectors={sectorsByMode[mode]}
              compareList={compareList}
              onCompareToggle={handleCompareToggle}
            />

            <ChartsPanel reits={reitsData} stocks={stocksData} />
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold text-text-accent">Asset Comparison</h1>
                <p className="text-xs text-text-muted mt-0.5">
                  Select up to 2 assets from the Dashboard to compare side-by-side
                </p>
              </div>
              <ModeToggle mode={mode} onChange={handleModeChange} />
            </div>
            <ComparePanel compareList={compareList} onRemove={handleCompareRemove} mode={mode} />
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-bold text-text-accent">Five Filters</h1>
              <p className="text-xs text-text-muted mt-0.5">
                SGX S-REIT Due Diligence Framework — Five-Filter Methodology
              </p>
            </div>
            <IntelligencePanel reits={reitsData} />
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-bold text-text-accent">Charts</h1>
              <p className="text-xs text-text-muted mt-0.5">
                Valuation, yield-trap and 52-week-low screens, calculated from nightly data
              </p>
            </div>
            <ChartsPanel reits={reitsData} stocks={stocksData} />
          </div>
        )}

        {activeTab === 'legacy' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <div>
              <h1 className="text-xl font-bold text-text-accent">Legacy Dividend Payers</h1>
              <p className="text-xs text-text-muted mt-0.5">
                Long unbroken payout records, calculated from dividend history
              </p>
            </div>
            <IntelligencePanel reits={reitsData} stocks={stocksData} showLegacy={true} />
          </div>
        )}

        {activeTab === 'rates' && (
          <div className="flex flex-col gap-4 sm:gap-6">
            <div>
              <h1 className="text-xl font-bold text-text-accent">SORA Rates Calculator</h1>
              <p className="text-xs text-text-muted mt-0.5">Live SORA + Adjustable Spread</p>
            </div>
            <RatesPanel />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
