import fs from "fs";

const OUTPUT_FILE = "./public/sora.json";

const PROPKAKI_API =
  "https://api.propkaki.sg/api/market/series?vertical=macro&keys=sora_3m_compounded_qtr";

const MAS_API =
  "https://eservices.mas.gov.sg/api/action/datastore/search.json?resource_id=9a0bf149-308c-4bd2-832d-76c8e6cb47ed&limit=1&sort=end_of_day%20desc";

async function fetchJson(url, timeout = 30000) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "SGXPTY-SORA-Updater/1.0"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error(`Expected JSON but received ${contentType}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFromPropKaki() {
  console.log("Fetching from PropKaki...");

  const json = await fetchJson(PROPKAKI_API);

  // Locate the requested series regardless of array/object layout.
  let series = null;

  if (Array.isArray(json)) {
    series = json.find(x => x.key === "sora_3m_compounded_qtr");
  } else if (Array.isArray(json.series)) {
    series = json.series.find(x => x.key === "sora_3m_compounded_qtr");
  } else if (json.series?.sora_3m_compounded_qtr) {
    series = json.series.sora_3m_compounded_qtr;
  } else {
    series = json;
  }

  let latest = null;

  // Common layouts
  if (Array.isArray(series?.values)) {
    latest = series.values.at(-1);
  } else if (Array.isArray(series?.data)) {
    latest = series.data.at(-1);
  } else if (Array.isArray(series?.history)) {
    latest = series.history.at(-1);
  }

  if (!latest) {
    throw new Error("Unable to locate latest PropKaki value.");
  }

  const rate = Number(
    latest.value ??
    latest.rate ??
    latest.sora ??
    latest.sora_3m_compounded_qtr
  );

  if (Number.isNaN(rate)) {
    throw new Error("Invalid PropKaki rate.");
  }

  return {
    source: "PropKaki",
    rate,
    effectiveDate:
      latest.period ??
      latest.date ??
      latest.quarter ??
      null
  };
}

async function fetchFromMAS() {
  console.log("Fetching from MAS...");

  const json = await fetchJson(MAS_API);

  const record = json.result?.records?.[0];

  if (!record) {
    throw new Error("No MAS records returned.");
  }

  const rate = Number(
    record.comp_sora_3m ??
    record.sora_3m
  );

  if (Number.isNaN(rate)) {
    throw new Error("Invalid MAS rate.");
  }

  return {
    source: "MAS",
    rate,
    effectiveDate:
      record.end_of_day ??
      record.date ??
      null
  };
}

function saveRate(result) {
  if (!fs.existsSync("./public")) {
    fs.mkdirSync("./public", {
      recursive: true
    });
  }

  const output = {
    soraRate: result.rate,
    source: result.source,
    effectiveDate: result.effectiveDate,
    lastUpdated: new Date().toISOString()
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(output, null, 2)
  );

  console.log("Saved:", output);
}

async function main() {
  try {
    const result = await fetchFromPropKaki();
    saveRate(result);
    return;
  } catch (err) {
    console.warn("PropKaki failed:", err.message);
  }

  try {
    const result = await fetchFromMAS();
    saveRate(result);
    return;
  } catch (err) {
    console.warn("MAS failed:", err.message);
  }

  if (fs.existsSync(OUTPUT_FILE)) {
    console.log("Keeping previous public/sora.json");
    process.exit(0);
  }

  throw new Error("No SORA data source available.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
