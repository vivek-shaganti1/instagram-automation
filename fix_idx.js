const fs = require('fs');
let text = fs.readFileSync('backend/src/index.ts', 'utf8');
text = text.replace('lastMetric.views <', 'lastMetric.impressions <');
fs.writeFileSync('backend/src/index.ts', text);
