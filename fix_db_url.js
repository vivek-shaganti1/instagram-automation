const fs = require('fs');

const oldUrlStr = 'postgresql://postgres.kepnvroifvwxhjlkiwvt:SRDoHMWHuYOWUJOI@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';
const newUrlStr = 'postgresql://postgres.kepnvroifvwxhjlkiwvt:SRDoHMWHuYOWUJOI@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

function fix(file) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(oldUrlStr, newUrlStr);
    fs.writeFileSync(file, content);
  }
}

fix('.env');
fix('backend/.env');

console.log("Fixed DB URLs");
