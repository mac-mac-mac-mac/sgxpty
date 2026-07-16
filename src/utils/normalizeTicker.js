// Simple normalization: uppercase trim and mapping lookup.
// Keep the mapping in data/ticker-map.json so it's editable.
import mapping from '../../data/ticker-map.json';

export function normalizeTicker(ticker) {
  if (!ticker && ticker !== 0) return '';
  const key = String(ticker).trim().toUpperCase();
  return mapping[key] || key;
}
