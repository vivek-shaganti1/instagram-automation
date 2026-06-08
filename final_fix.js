const fs = require('fs');
function replace(file, src, dst) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.split(src).join(dst);
  fs.writeFileSync(file, text);
}

replace('backend/src/cron.ts', 'latestMetric * 0 + ', '');
replace('backend/src/index.ts', 'lastMetric * 0 + ', '');
replace('backend/src/seed.ts', 'views:', 'impressions:');
replace('backend/src/worker.ts', 'tx.reel.', 'tx.generated_posts.');

console.log('Fixed final TS errors');
