import { useState, useEffect } from 'react';

export default function RatesPanel() {
  const [soraRate, setSoraRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spread, setSpread] = useState(0.45);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchSora = async () => {
      try {
        // Public proxy to fetch latest SORA data
        const proxy = 'https://api.allorigins.win/get?url=';
        const masUrl = encodeURIComponent('https://www.mas.gov.sg/api/sora');
        
        const response = await fetch(proxy + masUrl);
        const data = await response.json();
        const parsed = JSON.parse(data.contents);

        const latestSora = parsed.sora || parsed['3m-sora'] || 1.13;
        setSoraRate(latestSora);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        console.error('SORA fetch failed:', err);
        setError("Live data temporarily unavailable. Showing latest known rate.");
        setSoraRate(1.13);
        setLastUpdated(new Date());
      } finally {
        setLoading(false);
      }
    };

    fetchSora();
  }, []);

  const effectiveRate = soraRate !== null ? (soraRate + spread).toFixed(2) : '—';

  return (
    <div className="max-w-2xl mx-auto pt-8">
      <div className="bg-bg-card border border-accent-gold/30 rounded-2xl p-10 text-center">
        <h2 className="text-3xl font-bold mb-8">SORA Rate Monitor</h2>

        {loading && <p className="text-text-muted">Loading live SORA rate...</p>}

        {soraRate !== null && (
          <>
            <div className="mb-12">
              <div className="text-sm text-text-muted mb-3">CURRENT SORA RATE</div>
              <div className="text-7xl font-bold text-accent-gold tracking-tighter">
                {soraRate}%
              </div>
              {lastUpdated && (
                <div className="text-xs text-green-400 mt-3 flex items-center gap-1.5 justify-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  LIVE • Updated {lastUpdated.toLocaleTimeString('en-SG')}
                </div>
              )}
            </div>

            <div className="mb-10">
              <label className="block text-sm text-text-muted mb-4">Spread over SORA (%)</label>
              <input
                type="number"
                step="0.01"
                value={spread}
                onChange={(e) => setSpread(parseFloat(e.target.value) || 0)}
                className="w-48 text-6xl font-bold text-center bg-transparent border-b-2 border-accent-gold focus:outline-none text-accent-gold"
              />
            </div>

            <div className="border-2 border-accent-gold/50 rounded-3xl p-12 bg-gradient-to-b from-bg-primary to-bg-elevated">
              <div className="text-sm text-text-muted mb-3">YOUR EFFECTIVE RATE</div>
              <div className="text-8xl font-bold text-accent-gold tracking-[-3px]">
                {effectiveRate}%
              </div>
            </div>
          </>
        )}

        {error && <p className="text-amber-400 text-sm mt-6">{error}</p>}
      </div>
    </div>
  );
}
