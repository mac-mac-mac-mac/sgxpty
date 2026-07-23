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
        const masApi = 'https://eservices.mas.gov.sg/api/action/datastore/search.json?resource_id=9a0bf149-356b-4613-a5ea-4b2b2565ca66&limit=1&sort=end_of_day%20desc';
        const proxy = 'https://api.allorigins.win/get?url=';

        const response = await fetch(proxy + encodeURIComponent(masApi));
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        // Parse the stringified JSON returned inside data.contents
        const parsed = JSON.parse(data.contents);
        const latestRecord = parsed.result?.records?.[0];

        if (latestRecord) {
          // Support both common field names
          const rate = parseFloat(
            latestRecord.sora_3m || 
            latestRecord.comp_sora_3m || 
            latestRecord['3m_sora'] || 
            1.15
          );
          
          setSoraRate(rate);
          setLastUpdated(new Date());
          setError(null);
        } else {
          throw new Error('No data record found');
        }
      } catch (err) {
        console.error('SORA fetch failed:', err);
        setError("Live data temporarily unavailable. Showing latest known rate.");
        setSoraRate(1.15);
        setLastUpdated(new Date());
      } finally {
        setLoading(false);
      }
    };

    fetchSora();
  }, []);

  // Safe numerical calculations
  const currentSora = parseFloat(soraRate) || 0;
  const currentSpread = parseFloat(spread) || 0;
  const effectiveRate = soraRate !== null ? (currentSora + currentSpread).toFixed(2) : '—';

  return (
    <div className="max-w-4xl mx-auto pt-8">
      <div className="bg-bg-card border border-accent-gold/30 rounded-3xl p-8">
        <h2 className="text-3xl font-bold text-center mb-2">SORA Rates Calculator</h2>
        <p className="text-center text-text-muted mb-10">Live SORA + Adjustable Spread</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current SORA */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-8 text-center flex flex-col justify-center">
            <div className="text-sm text-text-muted mb-3">CURRENT 3M SORA</div>
            <div className="text-6xl font-bold text-accent-gold tracking-tighter">
              {loading ? '...' : (soraRate ? soraRate.toFixed(2) : '—')}%
            </div>
            {lastUpdated && (
              <div className="text-xs text-green-400 mt-4 flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                LIVE • {lastUpdated.toLocaleTimeString('en-SG')}
              </div>
            )}
          </div>

          {/* Spread */}
          <div className="bg-bg-elevated border border-border rounded-2xl p-8 text-center flex flex-col justify-center">
            <div className="text-sm text-text-muted mb-3">SPREAD OVER SORA (%)</div>
            <input
              type="number"
              step="0.01"
              value={spread}
              onChange={(e) => setSpread(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full text-6xl font-bold text-center bg-transparent focus:outline-none text-accent-gold border-b border-accent-gold"
            />
          </div>

          {/* Effective Rate */}
          <div className="bg-gradient-to-br from-accent-gold/10 to-bg-elevated border border-accent-gold/50 rounded-2xl p-8 text-center flex flex-col justify-center">
            <div className="text-sm text-text-muted mb-3">YOUR EFFECTIVE RATE</div>
            <div className="text-6xl font-bold text-accent-gold tracking-tighter">
              {effectiveRate}%
            </div>
          </div>
        </div>

        {error && <p className="text-center text-amber-400 text-sm mt-8">{error}</p>}
      </div>
    </div>
  );
}
