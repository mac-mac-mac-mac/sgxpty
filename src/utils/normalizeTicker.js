// src/utils/normalizeTicker.js
// Runtime-safe normalization helper. Never throws and avoids static JSON imports.
// If you want to use a mapping, inject it at runtime as window.__TICKER_MAP__.
export function normalizeTicker(ticker) {
  if (ticker === null || ticker === undefined || ticker === '') return '';
  const key = String(ticker).trim().toUpperCase();

  try {
    // Use a runtime-injected mapping if available (safer than static build-time JSON import)
    if (typeof window !== 'undefined' && window.__TICKER_MAP__ && window.__TICKER_MAP__[key]) {
      return window.__TICKER_MAP__[key];
    }
  } catch (err) {
    // ignore and fall back
  }

  // Fallback: return the canonical uppercase ticker so rendering never crashes.
  return key;
}
