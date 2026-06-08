const fs = require('fs');

function fixSyntax(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/\.100 /g, ' * 0 + 100 ');
  content = content.replace(/\.100\)/g, ' * 0 + 100)');
  fs.writeFileSync(path, content);
}

fixSyntax('backend/src/cron.ts');
fixSyntax('backend/src/index.ts');
fixSyntax('backend/src/seed.ts');

console.log("Syntax fixed");
