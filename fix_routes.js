const fs = require('fs');
let code = fs.readFileSync('backend/src/index.ts', 'utf8');

const target = `// POST /api/post-now
app.post("/api/post-now", async (req, res) => {
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
    const settingsMap = dbSettings.reduce((acc: any, cur) => {
      acc[cur.key] = cur.value;
      return acc;
    }, {});
    
    res.json({
      igUsername: settingsMap["instagram_username"] || "mock_user",
      igPassword: settingsMap["instagram_password"] || "••••••••",
      igHandle: settingsMap["instagram_handle"] || "mock_ai_agent",
      geminiKey: settingsMap["google_ai_api_key"] || "AIzaSyMockKey...",
      elevenLabsKey: settingsMap["elevenlabs_api_key"] || "el_mock_key...",
      pexelsKey: settingsMap["pexels_api_key"] || "px_mock_key...",
      targetBaseline: settingsMap["target_baseline"] || "100",
      growthMultiplier: settingsMap["growth_multiplier"] || "15%",
      igAccessToken: settingsMap["instagram_access_token"] || "",
      igAccountId: settingsMap["instagram_account_id"] || ""
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});`;

const replacement = `// POST /api/post-now
app.post("/api/post-now", async (req, res) => {
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

    let jobId = "job-" + Date.now();
    try {
      await videoQueue.add(
        "generate-video",
        {
          category: targetCategory,
          aggressive_hooks: aggressiveHooks,
          storyIndex,
          theme
        },
        { jobId }
      );
    } catch (qErr: any) {
      return res.status(500).json({ error: "Redis/Queue offline" });
    }

    res.json({ success: true, jobId, message: \`Reel generation for \${targetCategory} queued.\` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/settings
app.get("/api/settings", async (req, res) => {
  try {
    let dbSettings: any[] = [];
    try {
      dbSettings = await prisma.settings.findMany();
    } catch (dbErr: any) {
      return res.status(500).json({ error: "Database offline" });
    }
    const settingsMap = dbSettings.reduce((acc: any, cur) => {
      acc[cur.key] = cur.value;
      return acc;
    }, {});
    
    res.json({
      igUsername: settingsMap["instagram_username"] || "",
      igPassword: settingsMap["instagram_password"] || "••••••••",
      igHandle: settingsMap["instagram_handle"] || "",
      geminiKey: settingsMap["google_ai_api_key"] || "",
      elevenLabsKey: settingsMap["elevenlabs_api_key"] || "",
      pexelsKey: settingsMap["pexels_api_key"] || "",
      targetBaseline: settingsMap["target_baseline"] || "100",
      growthMultiplier: settingsMap["growth_multiplier"] || "15%",
      igAccessToken: settingsMap["instagram_access_token"] || "",
      igAccountId: settingsMap["instagram_account_id"] || ""
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});`;

code = code.replace(target, replacement);
fs.writeFileSync('backend/src/index.ts', code);
console.log("Restored routes");
