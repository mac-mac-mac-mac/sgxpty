import fs from "fs";

const OUTPUT_FILE = "./public/sora.json";

const PROPKAKI_API =
  "https://api.propkaki.sg/api/market/series?vertical=macro&keys=sora_3m_compounded_qtr";

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

async function main() {
  console.log("Fetching SORA from PropKaki...");

  const json = await fetchJson(PROPKAKI_API);

  if (!json.ok) {
    throw new Error("PropKaki returned ok=false");
  }

  const series = json.series.find(
    (x) => x.key === "sora_3m_compounded_qtr"
  );

  if (!series) {
    throw new Error("SORA series not found.");
  }

  if (!Array.isArray(series.points) || series.points.length === 0) {
    throw new Error("No SORA data available.");
  }

  const latest = series.points.at(-1);

  const output = {
    soraRate: latest.v,
    source: "PropKaki",
    effectiveDate: latest.q,
    lastUpdated: new Date().toISOString()
  };

  fs.mkdirSync("./public", { recursive: true });

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(output, null, 2)
  );

  console.log("✅ Updated public/sora.json");
  console.log(output);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
