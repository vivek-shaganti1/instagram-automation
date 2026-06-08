const fs = require('fs');
const path = require('path');

function replaceFile(file, regex, replacement) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(regex, replacement);
  fs.writeFileSync(file, text);
}

// Frontend replacements
replaceFile('frontend/app/settings/page.tsx', /"http:\/\/localhost:8000/g, 'process.env.NEXT_PUBLIC_API_URL + "');
replaceFile('frontend/app/library/page.tsx', /"http:\/\/localhost:8000\/api\/stats"/g, '`${process.env.NEXT_PUBLIC_API_URL}/api/stats`');
replaceFile('frontend/app/analytics/page.tsx', /"http:\/\/localhost:8000\/api\/stats"/g, '`${process.env.NEXT_PUBLIC_API_URL}/api/stats`');
replaceFile('frontend/app/forgot-password/page.tsx', /"http:\/\/localhost:8000/g, 'process.env.NEXT_PUBLIC_API_URL + "');
replaceFile('frontend/app/dashboard/page.tsx', /const getApiUrl = \(\) => process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/localhost:8000";/g, 'const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL;');

// Backend replacements
replaceFile('backend/src/index.ts', /"http:\/\/localhost:3000"/g, 'process.env.FRONTEND_URL || "http://localhost:3000"');

console.log("Localhost replaced");
