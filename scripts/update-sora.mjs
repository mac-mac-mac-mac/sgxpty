import fs from 'fs';

async function updateSora() {
  try {
    const masApi = 'https://eservices.mas.gov.sg/api/action/datastore/search.json?resource_id=9a0bf149-308c-4bd2-832d-76c8e6cb47ed&limit=1&sort=end_of_day%20desc';
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(masApi, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      // Check if response is actually JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response, got ${contentType || 'unknown content type'}`);
      }

      const data = await response.json();
      const latestRecord = data.result?.records?.[0];
      
      // Extract 3M Compounded SORA
      const raw3mSora = latestRecord?.comp_sora_3m || latestRecord?.sora_3m;
      const rate = parseFloat(raw3mSora) || 1.15;

      const output = {
        soraRate: rate,
        lastUpdated: new Date().toISOString()
      };

      if (!fs.existsSync('./public')) {
        fs.mkdirSync('./public');
      }
      
      fs.writeFileSync('./public/sora.json', JSON.stringify(output, null, 2));
      console.log('Successfully updated public/sora.json:', output);
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    console.error('Failed to update SORA rate:', err);
    process.exit(1);
  }
}

updateSora();
