const fs = require('fs');
const glob = require('glob'); // Not available by default, I'll use simple recursive readdir
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('./backend/src', filePath => {
  if (!filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content.replace(/prisma\.setting\b/g, 'prisma.settings');
  content = content.replace(/prisma\.usedConcept\b/g, 'prisma.used_concepts');
  content = content.replace(/prisma\.usedHook\b/g, 'prisma.used_hooks');
  content = content.replace(/prisma\.usedTheme\b/g, 'prisma.used_themes');
  content = content.replace(/prisma\.reel\b/g, 'prisma.generated_posts');
  content = content.replace(/prisma\.dailyMetric\b/g, 'prisma.analytics');
  content = content.replace(/prisma\.performanceMetric\b/g, 'prisma.analytics');

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
});
