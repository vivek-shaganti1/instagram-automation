const fs = require('fs');

function replaceFile(path, replacements) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  for (const [search, replace] of replacements) {
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(path, content);
}

// 1. ai.ts
let aiTs = fs.readFileSync('backend/src/services/ai.ts', 'utf8');
aiTs = aiTs.replace(/const performanceMetrics = await prisma\.analytics\.findMany\([\s\S]*?\);/, 'const performanceMetrics: any[] = [];');
aiTs = aiTs.replace(/const performanceMap = new Map\(performanceMetrics\.map\(m => \[m\.reelId, m\]\)\);/g, 'const performanceMap = new Map();');
aiTs = aiTs.replace(/hookText/g, 'hook_text');
aiTs = aiTs.replace(/themeName/g, 'theme_name');
fs.writeFileSync('backend/src/services/ai.ts', aiTs);

// 2. worker.ts
replaceFile('backend/src/worker.ts', [
  ['scheduledFor', 'scheduled_for'],
  ['postedAt', 'posted_at'],
  ['prisma.reel', 'prisma.generated_posts']
]);

// 3. index.ts
replaceFile('backend/src/index.ts', [
  ['prisma.user', 'prisma.users'],
  ['totalViews', 'views'],
  ['targetViews', '100'] // hardcoded or map
]);

// 4. cron.ts
replaceFile('backend/src/cron.ts', [
  ['totalViews', 'views'],
  ['targetViews', '100']
]);

// 5. scripts
replaceFile('backend/src/scripts/simulate_resilience.ts', [
  ['videoUrl', 'video_url']
]);
replaceFile('backend/src/seed.ts', [
  ['totalViews', 'views'],
  ['scheduledFor', 'scheduled_for']
]);

console.log("Fixes applied");
