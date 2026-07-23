import { useState, useEffect } from 'react';

export default function RatesPanel() {
  const [soraRate, setSoraRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spread, setSpread] = useState(0.45);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchCachedSora = async () => {
      try {
        // Fast static fetch directly from the generated public asset
        const response = await fetch('/sora.json');
        if (!response.ok) throw new Error('Failed to load local rate');

        const data = await response.json();
        setSoraRate(data.soraRate);
        setLastUpdated(new Date(data.lastUpdated));
      } catch (err) {
        console.error('Static fetch error, falling back:', err);
        setSoraRate(1.15); // Default fallback
      } finally {
        setLoading(false);
      }
    };

    fetchCachedSora();
  }, []);

  const soraNum = parseFloat(soraRate) || 0;
  const spreadNum = parseFloat(spread) || 0;
  const effectiveRate = soraRate !== null ? (soraNum + spreadNum).toFixed(2) : '—';

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
              {loading ? '...' : (soraRate !== null ? soraNum.toFixed(2) : '—')}%
            </div>
            {lastUpdated && (
              <div className="text-xs text-green-400 mt-4 flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                UPDATED • {lastUpdated.toLocaleDateString('en-SG')} {lastUpdated.toLocaleTimeString('en-SG')}
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
              onChange={(e) => setSpread(e.target.value)}
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
      </div>
    </div>
  );
}
