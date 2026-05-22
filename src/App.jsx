import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DashboardTable from './components/DashboardTable';
import ComparePanel from './components/ComparePanel';
import ChartsPanel from './components/ChartsPanel';
import IntelligencePanel from './components/IntelligencePanel';
import Footer from './components/Footer';
import { REITS, SECTORS } from './data/reits';
import { ETFS, ETF_CATEGORIES } from './data/etfs';
import { fetchQuotes, applyLiveData } from './lib/yahooFinance';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mode, setMode] = useState('reits'); // 'reits' | 'etfs'
  const [reitsData, setReitsData] = useState(REITS);
  const [etfsData, setEtfsData] = useState(ETFS);
  const [liveStatus, setLiveStatus] = useState('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [reitSearch, setReitSearch] = useState('');
  const [etfSearch, setEtfSearch] = useState('');
  const [reitSector, setReitSector] = useState('All');
  const [etfCategory, setEtfCategory] = useState('All');

  const [compareList, setCompareList] = useState([]);

  const loadLiveData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const allTickers = [...REITS.map((r) => r.ticker), ...ETFS.map((e) => e.ticker)];
      const liveMap = await fetchQuotes(allTickers);
      if (Object.keys(liveMap).length > 0) {
        setReitsData(applyLiveData(REITS, liveMap));
        setEtfsData(applyLiveData(ETFS, liveMap));
        setLiveStatus('live');
      } else {
        setLiveStatus('fallback');
      }
    } catch {
      setLiveStatus('fallback');
    } finally {
      setIsRefreshing(false);
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
              </div>
            </div>

            {/* Live data banner */}
            {liveStatus === 'live' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-accent-green/5 border border-accent-green/20 rounded text-xs text-accent-green">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                Live data loaded from Yahoo Finance
              </div>
            )}
            {liveStatus === 'fallback' && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/20 rounded text-xs text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Using static dataset — Yahoo Finance unavailable (Netlify Functions required for live data)
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
                    View comparison &rarr;
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

        {activeTab === 'intelligence' && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-bold text-text-accent">Market Intelligence</h1>
              <p className="text-xs text-text-muted mt-0.5">
                SGX S-REIT Due Diligence Framework — Five-Filter Methodology
              </p>
            </div>
            <IntelligencePanel reits={reitsData} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
