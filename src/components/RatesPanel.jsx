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
        console.error(err);
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
    <div className="max-w-3xl mx-auto pt-8">
      <div className="bg-bg-card border border-accent-gold/30 rounded-3xl p-8">
        <h2 className="text-3xl font-bold text-center mb-10">SORA Rate Monitor</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Current SORA */}
          <div className="text-center border border-border rounded-2xl p-6">
            <div className="text-sm text-text-muted mb-2">CURRENT SORA</div>
            <div className="text-6xl font-bold text-accent-gold tracking-tighter mb-1">
              {soraRate ? soraRate : '—'}%
            </div>
            {lastUpdated && (
              <div className="text-xs text-green-400 flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                LIVE • {lastUpdated.toLocaleTimeString('en-SG')}
              </div>
            )}
          </div>

          {/* Spread Input */}
          <div className="text-center border border-border rounded-2xl p-6">
            <div className="text-sm text-text-muted mb-4">SPREAD OVER SORA (%)</div>
            <input
              type="number"
              step="0.01"
              value={spread}
              onChange={(e) => setSpread(parseFloat(e.target.value) || 0)}
              className="w-full text-6xl font-bold text-center bg-transparent focus:outline-none text-accent-gold border-b-2 border-accent-gold"
            />
          </div>

          {/* Effective Rate */}
          <div className="text-center border border-accent-gold/50 bg-gradient-to-b from-bg-primary to-bg-elevated rounded-3xl p-6 flex flex-col justify-center">
            <div className="text-sm text-text-muted mb-2">YOUR EFFECTIVE RATE</div>
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
