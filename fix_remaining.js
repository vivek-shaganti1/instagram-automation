const fs = require('fs');
function replaceFile(path, replacements) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  for (const [search, replace] of replacements) {
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(path, content);
}

replaceFile('backend/src/cron.ts', [
  ['latestMetric.views', 'latestMetric.impressions']
]);

replaceFile('backend/src/index.ts', [
  ['latestMetric.views', 'latestMetric.impressions']
]);

replaceFile('backend/src/scripts/simulate_resilience.ts', [
  ['scheduledFor', 'scheduled_for']
]);

replaceFile('backend/src/seed.ts', [
  ['views: 112', 'impressions: 112'],
  ['views: 128', 'impressions: 128'],
  ['views: 151', 'impressions: 151'],
  ['views: 165', 'impressions: 165'],
  ['views: 208', 'impressions: 208'],
  ['views: 237', 'impressions: 237'],
  ['views: 271', 'impressions: 271'],
  ['views: 282', 'impressions: 282'],
  ['views: 324', 'impressions: 324'],
  ['views: 1406', 'impressions: 1406'],
  ['views: 1579', 'impressions: 1579'],
  ['views:', 'impressions:'],
  ['postedAt', 'posted_at']
]);

replaceFile('backend/src/services/ai.ts', [
  ['viralScore', 'viral_score']
]);

replaceFile('backend/src/worker.ts', [
  ['prisma.reel', 'prisma.generated_posts'],
  ['videoUrl', 'video_url']
]);

console.log("Remaining fixed");
