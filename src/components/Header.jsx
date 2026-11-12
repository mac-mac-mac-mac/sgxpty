import { useEffect, useRef } from 'react';
import { BarChart2, RefreshCw, Wifi, WifiOff } from 'lucide-react';

export default function Header({
  activeTab,
  onTabChange,
  liveStatus,
  onRefresh,
  isRefreshing,
  tabs: customTabs,
}) {
  const defaultTabs = [
    { id: 'filters', label: 'Five Filters' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'compare', label: 'Compare' },
    { id: 'charts', label: 'Charts' },
  ];

  const tabs = customTabs ?? defaultTabs;
  const stripRef = useRef(null);

  // On phones the tab strip scrolls sideways: keep the active tab in view
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-active="true"]');
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeTab]);

  const tabButton = (tab) => (
    <button
      key={tab.id}
      data-active={activeTab === tab.id}
      onClick={() => onTabChange(tab.id)}
      className={`px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
        activeTab === tab.id
          ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
      }`}
    >
      {tab.label}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-secondary/95 backdrop-blur-sm">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 md:h-14 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-accent-gold/20 border border-accent-gold/40">
              <BarChart2 className="w-4 h-4 text-accent-gold" />
            </div>
            <div>
              <span className="font-mono text-sm font-semibold tracking-widest text-accent-gold uppercase">
                SGXPTY
              </span>
              <span className="ml-2 text-xs text-text-muted hidden lg:inline">
                SGX Intelligence
              </span>
            </div>
          </div>

          {/* Tabs — inline on desktop */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Sections">
            {tabs.map(tabButton)}
          </nav>

          {/* Status + Refresh — always visible */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-xs" title={liveStatus === 'live' ? 'Live prices' : liveStatus === 'fallback' ? 'Static data' : liveStatus === 'loading' ? 'Loading live prices' : 'Last close'}>
              {liveStatus === 'live' && (
                <>
                  <Wifi className="w-3.5 h-3.5 text-accent-green" />
                  <span className="text-accent-green hidden sm:inline">Live</span>
                </>
              )}
              {liveStatus === 'fallback' && (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-500 hidden sm:inline">Static</span>
                </>
              )}
              {liveStatus === 'loading' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse sm:hidden" />
                  <span className="text-text-muted animate-pulse hidden sm:inline">Loading…</span>
                </>
              )}
            </div>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh live prices"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-text-secondary hover:text-text-primary hover:border-border-active transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Tabs — scrollable strip on phones */}
        <div className="relative md:hidden">
          <nav
            ref={stripRef}
            aria-label="Sections"
            className="-mx-4 px-4 pb-2 flex gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map(tabButton)}
          </nav>
          <div className="pointer-events-none absolute right-[-1rem] top-0 bottom-2 w-8 bg-gradient-to-l from-bg-secondary to-transparent" />
        </div>
      </div>
    </header>
  );
}
