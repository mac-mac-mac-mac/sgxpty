import { BarChart2, RefreshCw, Wifi, WifiOff } from 'lucide-react';

export default function Header({ activeTab, onTabChange, liveStatus, onRefresh, isRefreshing }) {
 const tabs = [
  { id: 'filters', label: 'Five Filters' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'compare', label: 'Compare' },
  { id: 'charts', label: 'Charts' },
];


  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg-secondary/95 backdrop-blur-sm">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-accent-gold/20 border border-accent-gold/40">
              <BarChart2 className="w-4 h-4 text-accent-gold" />
            </div>
            <div className="hidden sm:block">
              <span className="font-mono text-sm font-semibold tracking-widest text-accent-gold uppercase">
                SGXPTY
              </span>
              <span className="ml-2 text-xs text-text-muted hidden lg:inline">
                SGX Intelligence
              </span>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-accent-gold/15 text-accent-gold border border-accent-gold/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Status + Refresh */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              {liveStatus === 'live' && (
                <>
                  <Wifi className="w-3 h-3 text-accent-green" />
                  <span className="text-accent-green">Live</span>
                </>
              )}
              {liveStatus === 'fallback' && (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-500">Static</span>
                </>
              )}
              {liveStatus === 'loading' && (
                <span className="text-text-muted animate-pulse">Loading…</span>
              )}
            </div>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-text-secondary hover:text-text-primary hover:border-border-active transition-all disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
