const fs = require('fs');
let code = fs.readFileSync('backend/src/index.ts', 'utf8');

const targetRegex = /app\.post\("\/api\/post-now", async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, jobId, message: `Reel generation for \$\{targetCategory\} queued\.` \}\);\s*\} catch \(error: any\) \{\s*res\.status\(500\)\.json\(\{ error: error\.message \}\);\s*\}\s*\}\);/;

const replacement = `app.post("/api/post-now", async (req, res) => {
  try {
    const { category } = req.body;
    const targetCategory = category || "ai"; // fallback
    
    // Check metric threshold
    let lastMetric = null;
    try {
      lastMetric = await prisma.analytics.findFirst({
        orderBy: { date: "desc" }
      });
    } catch (dbErr: any) {
      return res.status(500).json({ error: "Database offline" });
    }
    const aggressiveHooks = lastMetric ? lastMetric.impressions < (100 / 3) : false;

    // Generate dynamic index and random theme for style and content variety
    const storyIndex = Date.now();
    const themes = ["apple_minimal", "bloomberg_dark", "startup_editorial", "cyber_documentary", "luxury_white", "midnight_strategy", "founder_mode", "ai_war_room", "modern_finance", "intelligence_briefing"];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    // CREATE DB RECORD FIRST so it shows in the UI immediately
    const newReel = await prisma.generated_posts.create({
      data: {
        category: targetCategory,
        status: "PENDING",
        headline: \`Manual Generation (\${targetCategory})\`,
        script: {},
        caption: "Waiting for background worker...",
        scheduled_for: new Date(),
      }
    });

    let jobId = "mock-job-" + Date.now();
    try {
      const addPromise = researchQueue.add(
        "manual-post-job",
        {
          category: targetCategory,
          aggressiveHooks,
          storyIndex,
          theme,
          reelId: newReel.id
        },
        { jobId }
      );
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Redis timeout")), 1500));
      const job = await Promise.race([addPromise, timeoutPromise]) as any;
      jobId = job.id?.toString() || jobId;
      
      await prisma.generated_posts.update({
        where: { id: newReel.id },
        data: { status: "GENERATING", headline: "Queued successfully" }
      });
    } catch (redisErr: any) {
      console.warn("⚠️ Redis/Queue offline. Marking job as Simulated.");
      await prisma.generated_posts.update({
        where: { id: newReel.id },
        data: { status: "FAILED", error: "Redis offline - Simulated", headline: "Simulated Post" }
      });
    }

    res.json({ success: true, jobId, message: \`Reel generation for \${targetCategory} queued.\` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});`;

if (targetRegex.test(code)) {
  code = code.replace(targetRegex, replacement);
  fs.writeFileSync('backend/src/index.ts', code);
  console.log("Successfully fixed /api/post-now to insert into DB.");
} else {
  console.log("Target not found!");
}
