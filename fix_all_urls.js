const fs = require('fs');

function fix(file, regex, replace) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(regex, replace);
  fs.writeFileSync(file, text);
}

fix('frontend/app/analytics/page.tsx', /`\$\{process\.env\.NEXT_PUBLIC_API_URL\}\/api\/stats`/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/stats`');
fix('frontend/app/library/page.tsx', /`\$\{process\.env\.NEXT_PUBLIC_API_URL\}\/api\/stats`/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/stats`');
fix('frontend/app/forgot-password/page.tsx', /process\.env\.NEXT_PUBLIC_API_URL \+ "\/api\/auth\/forgot-password"/g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/auth/forgot-password"');
fix('frontend/app/settings/page.tsx', /process\.env\.NEXT_PUBLIC_API_URL \+ "\/api\/settings"/g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/settings"');

console.log("Fixed all URLs with fallback");
