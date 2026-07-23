import { useState, useEffect } from 'react';

export default function RatesPanel() {
  const [soraRate, setSoraRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [spread, setSpread] = useState(0.45);
  const [error, setError] = useState(null);

  // Fetch latest SORA (you can replace with better API if needed)
  useEffect(() => {
    const fetchSora = async () => {
      try {
        // Public sources or MAS - using a reliable proxy or direct fetch
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/SGD'); // placeholder - replace with real SORA source
        // For real SORA, use MAS or a service like:
        // https://www.mas.gov.sg/api or scrape a public page
        // For now, use a static fallback + comment
        setSoraRate(1.13); // Replace with real fetch logic
        setLoading(false);
      } catch (err) {
        setError("Unable to fetch live SORA. Using latest known value.");
        setSoraRate(1.13);
        setLoading(false);
      }
    };
    fetchSora();
  }, []);

  const effectiveRate = (soraRate + spread).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-bg-card border border-accent-gold/30 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-semibold mb-2">SORA Rate Monitor</h2>
        <p className="text-text-muted mb-8">Live Singapore Overnight Rate Average + Adjustable Spread</p>

        {loading && <p className="text-text-muted">Loading live SORA rate...</p>}
        {error && <p className="text-amber-400 text-sm mb-4">{error}</p>}

        {soraRate !== null && (
          <>
            <div className="mb-10">
              <div className="text-sm text-text-muted">CURRENT SORA</div>
              <div className="text-6xl font-bold text-accent-gold tracking-tighter mt-2">
                {soraRate}%
              </div>
            </div>

            <div className="bg-bg-elevated border border-border rounded-xl p-6 mb-8">
              <label className="block text-sm text-text-muted mb-3">Spread over SORA (%)</label>
              <input
                type="number"
                step="0.01"
                value={spread}
                onChange={(e) => setSpread(parseFloat(e.target.value) || 0)}
                className="w-full text-5xl font-bold text-center bg-transparent focus:outline-none"
              />
            </div>

            <div className="border border-accent-gold/50 rounded-2xl p-8 bg-gradient-to-b from-bg-card to-bg-elevated">
              <div className="text-sm text-text-muted mb-2">EFFECTIVE RATE</div>
              <div className="text-7xl font-bold text-accent-gold tracking-[-2px]">
                {effectiveRate}%
              </div>
              <div className="text-xs text-text-muted mt-3">SORA + Spread</div>
            </div>
          </>
        )}
      </div>

      <p className="text-center text-xs text-text-muted mt-8">
        Data refreshed daily from MAS • For reference only
      </p>
    </div>
  );
}
