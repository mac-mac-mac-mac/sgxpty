// scripts/update-fundamentals.mjs
// CLI tool for quarterly fundamental updates
// Usage: node scripts/update-fundamentals.mjs <TICKER> [options]
//
// Options:
//   --gearing <number>          Aggregate leverage %
//   --occupancy <number>        Portfolio occupancy %
//   --dpuGrowth <number>        YoY DPU growth %
//   --nav <number>              NAV per unit
//   --wale <number>             Weighted avg lease expiry (years)
//   --distributionStatus <str>  active | reduced | suspended
//
// Examples:
//   node scripts/update-fundamentals.mjs BUOU --gearing 38.7 --occupancy 96.1 --dpuGrowth -1.7
//   node scripts/update-fundamentals.mjs BTOU --distributionStatus suspended
//   node scripts/update-fundamentals.mjs M44U --gearing 40.5 --dpuGrowth -9.8 --occupancy 96.4

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const REITS_FILE  = path.join(__dirname, '../src/data/reits.js');

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const ticker  = args[0]?.toUpperCase();

if (!ticker || ticker.startsWith('--')) {
  console.error('Usage: node scripts/update-fundamentals.mjs <TICKER> [--field value ...]');
  process.exit(1);
}

const ALLOWED = ['gearing','occupancy','dpuGrowth','nav','wale','distributionStatus'];
const updates = {};

for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const val = args[i + 1];
    if (!ALLOWED.includes(key)) {
      console.error(`Unknown field: ${key}. Allowed: ${ALLOWED.join(', ')}`);
      process.exit(1);
    }
    if (val == null || val.startsWith('--')) {
      console.error(`Missing value for --${key}`);
      process.exit(1);
    }
    updates[key] = key === 'distributionStatus' ? val : parseFloat(val);
    i++;
  }
}

if (Object.keys(updates).length === 0) {
  console.error('No fields specified. Nothing to update.');
  process.exit(1);
}

// ── Read reits.js as text and patch field values ──────────────────────────────
let source = readFileSync(REITS_FILE, 'utf8');

// Find the ticker block
const tickerPattern = new RegExp(`ticker:\\s*['"]${ticker}['"]`);
if (!tickerPattern.test(source)) {
  console.error(`Ticker "${ticker}" not found in reits.js`);
  process.exit(1);
}

// Locate the start of this ticker's object — find the { before ticker:
const tickerIdx = source.search(tickerPattern);

// Find the closing }, of this entry by counting braces from tickerIdx
let depth = 0;
let start = tickerIdx;
// Walk back to find opening {
while (start > 0 && source[start] !== '{') start--;

let end = start;
while (end < source.length) {
  if (source[end] === '{') depth++;
  if (source[end] === '}') {
    depth--;
    if (depth === 0) { end++; break; }
  }
  end++;
}

let block = source.slice(start, end);
const original = block;

// Patch each field
for (const [key, value] of Object.entries(updates)) {
  const strVal = typeof value === 'string' ? `'${value}'` : value;

  // Match existing field: key: <value>,  (number or string)
  const fieldRe = new RegExp(
    `(${key}:\\s*)('[^']*'|"[^"]*"|-?[\\d.]+)(,?)`,
    ''
  );

  if (fieldRe.test(block)) {
    block = block.replace(fieldRe, `$1${strVal}$3`);
    console.log(`  ✓ ${ticker}.${key}: → ${value}`);
  } else {
    console.warn(`  ⚠ Field "${key}" not found in ${ticker} block — skipping`);
  }
}

if (block === original) {
  console.log('No changes made.');
  process.exit(0);
}

source = source.slice(0, start) + block + source.slice(end);
writeFileSync(REITS_FILE, source, 'utf8');

console.log(`\n✅ reits.js updated for ${ticker}`);
console.log(`   Fields changed: ${Object.keys(updates).join(', ')}`);
console.log(`   Run "git diff src/data/reits.js" to verify before committing.`);
