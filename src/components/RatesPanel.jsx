import { useState } from 'react';

export default function RatesPanel() {
  const [soraRate] = useState(1.13);
  const [spread, setSpread] = useState(0.45);

  const effectiveRate = (soraRate + spread).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto pt-8">
      <div className="bg-bg-card border border-accent-gold/30 rounded-2xl p-10 text-center">
        <h2 className="text-3xl font-bold mb-8">SORA Rate Monitor</h2>

        <div className="mb-12">
          <div className="text-sm text-text-muted mb-3">CURRENT SORA RATE</div>
          <div className="text-7xl font-bold text-accent-gold tracking-tighter">
            {soraRate}%
          </div>
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
      </div>
    </div>
  );
}
