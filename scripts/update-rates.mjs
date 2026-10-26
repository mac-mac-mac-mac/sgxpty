// scripts/update-rates.mjs
// Fetches US Treasury yields + SGD FX rates daily → public/rates.json
// Sources: FRED (St. Louis Fed) for US rates, open.er-api.com for FX

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '../public/rates.json');

const HEADERS = {
  'User-Agent': 'SGXPTY-Rates-Updater/1.0',
  'Accept': 'text/plain,application/json,*/*',
};

async function fetchText(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}
async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

// Parse FRED CSV → last non-empty value
function parseFredCsv(csv) {
  const lines = csv.trim().split('\n').slice(1); // skip header
  for (let i = lines.length - 1; i >= 0; i--) {
    const [date, val] = lines[i].split(',');
    if (val && val.trim() !== '.') return { date: date.trim(), value: parseFloat(val.trim()) };
  }
  return null;
}

async function main() {
  console.log(`\nSGXPTY Rates Fetch — ${new Date().toISOString()}\n`);

  // ── US rates ────────────────────────────────────────────────────────────────
  let us = null;
  try {
    const [fedCsv, t2yCsv, t10yCsv] = await Promise.all([
      fetchText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=FEDFUNDS'),
      fetchText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS2'),
      fetchText('https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10'),
    ]);
    const fed = parseFredCsv(fedCsv);
    const t2y = parseFredCsv(t2yCsv);
    const t10y = parseFredCsv(t10yCsv);
    us = {
      fedFunds:       fed?.value  ?? null,
      t2y:            t2y?.value  ?? null,
      t10y:           t10y?.value ?? null,
      spread10y2y:    (t10y?.value != null && t2y?.value != null)
                        ? +((t10y.value - t2y.value).toFixed(2))
                        : null,
      date:           t10y?.date  ?? fed?.date ?? null,
    };
    console.log(`✅ US rates: Fed ${us.fedFunds}%, 2Y ${us.t2y}%, 10Y ${us.t10y}%`);
  } catch (err) {
    console.warn(`⚠️  US rates failed: ${err.message}`);
  }

  // ── FX rates (1 SGD = X foreign) ───────────────────────────────────────────
  let fx = null;
  try {
    const data = await fetchJson('https://open.er-api.com/v6/latest/SGD');
    fx = {
      base: 'SGD',
      date: new Date().toISOString().slice(0, 10),
      rates: {
        USD: data.rates?.USD ? +data.rates.USD.toFixed(4) : null,
        MYR: data.rates?.MYR ? +data.rates.MYR.toFixed(4) : null,
        AUD: data.rates?.AUD ? +data.rates.AUD.toFixed(4) : null,
        HKD: data.rates?.HKD ? +data.rates.HKD.toFixed(4) : null,
        JPY: data.rates?.JPY ? +data.rates.JPY.toFixed(2)  : null,
        GBP: data.rates?.GBP ? +data.rates.GBP.toFixed(4) : null,
        EUR: data.rates?.EUR ? +data.rates.EUR.toFixed(4) : null,
        CNY: data.rates?.CNY ? +data.rates.CNY.toFixed(4) : null,
      },
    };
    console.log(`✅ FX: SGD/USD ${fx.rates.USD}, SGD/MYR ${fx.rates.MYR}, SGD/JPY ${fx.rates.JPY}`);
  } catch (err) {
    console.warn(`⚠️  FX rates failed: ${err.message}`);
  }

  const output = { us, fx, fetchedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`\n✅ Written to public/rates.json`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
