// Safe formatting helpers. Use these in render layers only.
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!isFinite(n)) return '—';
  return n.toFixed(2);
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!isFinite(n)) return '—';
  return `${n.toFixed(2)}%`;
}

// Signed percent: '+1.23%' or '-0.45%'
export function formatSignedPercent(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!isFinite(n)) return '—';
  return (n >= 0 ? '+' : '') + `${n.toFixed(2)}%`;
}
