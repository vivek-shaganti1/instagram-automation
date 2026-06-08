const fs = require('fs');

function fixPage(path) {
  if (!fs.existsSync(path)) return;
  let text = fs.readFileSync(path, 'utf8');
  text = text.replace(/import \{ Button \} from "@\/components\/ui\/button";/g, '');
  text = text.replace(/<Button/g, '<button');
  text = text.replace(/<\/Button>/g, '</button>');
  fs.writeFileSync(path, text);
}

fixPage('frontend/app/login/page.tsx');
fixPage('frontend/app/signup/page.tsx');
console.log('Fixed buttons');
