const fs = require('fs');

let file = 'frontend/app/analytics/page.tsx';
if (fs.existsSync(file)) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/const chartData = data && Object\.keys\(data\)\.length > 0 \? Object\.entries\(data\)\.map.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\n.*?\];/g, 'const chartData = data && Object.keys(data).length > 0 ? Object.entries(data).map(([date, stats]: [string, any]) => ({\n    name: date,\n    Views: stats.total_views,\n    Target: stats.target_views,\n    Posts: stats.post_count,\n  })) : [];');
  fs.writeFileSync(file, code);
}

console.log("Mocks stripped from frontend");
