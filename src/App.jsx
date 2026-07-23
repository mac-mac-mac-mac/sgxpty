import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import DashboardTable from './components/DashboardTable';
import ComparePanel from './components/ComparePanel';
import ChartsPanel from './components/ChartsPanel';
import IntelligencePanel from './components/IntelligencePanel';
import Footer from './components/Footer';
import { REITS, SECTORS } from './data/reits';
import { ETFS, ETF_CATEGORIES } from './data/etfs';
import { fetchSingleQuote, applyLiveData } from './lib/yahooFinance';
import DAILY_PRICES from './data/prices.json'


export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  // tab IDs: 'filters' | 'dashboard' | 'compare' | 'charts'
  const [mode, setMode] = useState('reits'); // 'reits' | 'etfs'
  const hasDailyPrices = Object.keys(DAILY_PRICES).length > 0;
  const [reitsData, setReitsData] = useState(() =>
    hasDailyPrices ? applyLiveData(REITS, DAILY_PRICES) : REITS
  );
  const [etfsData, setEtfsData] = useState(() =>
    hasDailyPrices ? applyLiveData(ETFS, DAILY_PRICES) : ETFS
  );
  const [liveStatus, setLiveStatus] = useState(hasDailyPrices ? 'daily' : 'loading');

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [reitSearch, setReitSearch] = useState('');
  const [etfSearch, setEtfSearch] = useState('');
  const [reitSector, setReitSector] = useState('All');
  const [etfCategory, setEtfCategory] = useState('All');

  const [compareList, setCompareList] = useState([]);
  const [liveCount, setLiveCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const abortRef = useRef(null);
  const liveMapRef = useRef({});

  const loadLiveData = useCallback(async () => {
    // Cancel any previous in-progress fetch
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Reset
    liveMapRef.current = {};
    setLiveCount(0);
    setIsRefreshing(true);
    setLiveStatus('loading');

    const allTickers = [
      ...REITS.map((r) => r.ticker),
      ...ETFS.map((e) => e.ticker),
    ];
    setTotalCount(allTickers.length);

    let loaded = 0;

    for (let i = 0; i < allTickers.length; i++) {
      if (controller.signal.aborted) break;

      const ticker = allTickers[i];
      try {
        const data = await fetchSingleQuote(ticker);
        liveMapRef.current[ticker] = data;
        loaded++;
        setLiveCount(loaded);

        // Update UI immediately after each successful fetch
        setReitsData(applyLiveData(REITS, { ...liveMapRef.current }));
        setEtfsData(applyLiveData(ETFS, { ...liveMapRef.current }));

        // Show "live" as soon as the first quote arrives
        if (loaded === 1) setLiveStatus('live');
      } catch (err) {
        console.warn(`[SGXPTY] ${ticker}:`, err.message);
      }

      // 1.5s gap between requests — stays under Yahoo's rate limit
      if (i < allTickers.length - 1 && !controller.signal.aborted) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    if (!controller.signal.aborted) {
      setIsRefreshing(false);
      if (loaded === 0) setLiveStatus('fallback');
    }
  }, []);


  useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

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

  const currentData = mode === 'reits' ? reitsData : etfsData;
  const currentSearch = mode === 'reits' ? reitSearch : etfSearch;
  const currentSector = mode === 'reits' ? reitSector : etfCategory;
  const currentSectors = mode === 'reits' ? SECTORS : ETF_CATEGORIES;

  function handleSearchChange(v) {
    if (mode === 'reits') setReitSearch(v);
    else setEtfSearch(v);
  }

  function handleSectorFilter(s) {
    if (mode === 'reits') setReitSector(s);
    else setEtfCategory(s);
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
          { id: 'legacy', label: 'Legacy' },
        ]}
      />

      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            {/* Mode toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold text-text-accent">SGX Market Dashboard</h1>
                <p className="text-xs text-text-muted mt-0.5">
                  {mode === 'reits'
                    ? `${reitsData.length} S-REITs & Property Trusts`
                    : `${etfsData.length} ETFs listed on SGX`}
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-bg-elevated border border-border rounded-lg">
                <button
                  onClick={() => setMode('reits')}
                  className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${
                    mode === 'reits'
                      ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  REITs
                </button>
                <button
                  onClick={() => setMode('etfs')}
                  className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${
                    mode === 'etfs'
                      ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  ETFs
                </button>
                <button
  onClick={() => setActiveTab('rates')}
  className={`px-5 py-2 rounded text-sm font-medium transition-all ${
    activeTab === 'rates' 
      ? 'bg-accent-gold text-black' 
      : 'text-text-secondary hover:text-text-primary'
  }`}
>
  Rates
</button>
              </div>
            </div>

            {/* Live data banner */}
            {liveStatus === 'live' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-accent-green/5 border border-accent-green/20 rounded text-xs text-accent-green">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                Live data loaded from Yahoo Finance
              </div>
            )}
            {liveStatus === 'daily' && (
              <div className="flex items-center justify-between px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded text-xs text-blue-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  Showing last close prices — updated daily at 5:30pm SGT
                </div>
                <button
                  onClick={loadLiveData}
                  className="underline hover:text-blue-300 transition-colors"
                >
                  Refresh for live prices →
                </button>
              </div>
            )}

            {liveStatus === 'loading' && totalCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/5 border border-blue-500/20 rounded text-xs text-blue-400">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Fetching live prices — {liveCount} / {totalCount} tickers (~60s due to SGX rate limits)
                <div className="flex-1 max-w-48 h-1 bg-blue-500/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: totalCount > 0 ? `${(liveCount / totalCount) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            )}
            {liveStatus === 'fallback' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded text-xs text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Using static dataset — live data unavailable
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

            <DashboardTable
              data={currentData}
              mode={mode}
              search={currentSearch}
              onSearchChange={handleSearchChange}
              sectorFilter={currentSector}
              onSectorFilter={handleSectorFilter}
              sectors={currentSectors}
              compareList={compareList}
              onCompareToggle={handleCompareToggle}
            />

            <ChartsPanel reits={reitsData} etfs={etfsData} />
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-bold text-text-accent">Asset Comparison</h1>
                <p className="text-xs text-text-muted mt-0.5">
                  Select up to 2 assets from the Dashboard to compare side-by-side
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-bg-elevated border border-border rounded-lg">
                <button
                  onClick={() => setMode('reits')}
                  className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${
                    mode === 'reits'
                      ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  REITs
                </button>
                <button
                  onClick={() => setMode('etfs')}
                  className={`px-4 py-1.5 rounded text-xs font-medium transition-all ${
                    mode === 'etfs'
                      ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  ETFs
                </button>
              </div>
            </div>
            <ComparePanel
              compareList={compareList}
              onRemove={handleCompareRemove}
              mode={mode}
            />
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
                Sector distribution, yield analysis and allocation breakdowns
              </p>
            </div>
            <ChartsPanel reits={reitsData} etfs={etfsData} />
          </div>
        )}
        {activeTab === 'legacy' && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-bold text-text-accent">Legacy Dividend Payers</h1>
              <p className="text-xs text-text-muted mt-0.5">
                20-Year Champions + Reliable Long-term Payers
              </p>
            </div>
            <IntelligencePanel reits={reitsData} showLegacy={true} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
