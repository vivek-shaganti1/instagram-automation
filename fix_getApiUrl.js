const fs = require('fs');

function fix(file) {
  if (!fs.existsSync(file)) return;
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/const getApiUrl = \(\) => process\.env\.NEXT_PUBLIC_API_URL;/g, 'const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";');
  fs.writeFileSync(file, text);
}

fix('frontend/app/dashboard/page.tsx');
console.log('Fixed getApiUrl');
