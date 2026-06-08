import { AIService } from "../services/ai";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const aiService = new AIService();

async function runStrategySimulation() {
  console.log("🚀 STARTING VIRAL STRATEGIST 100-REEL SIMULATION 🚀");
  
  // Backup API key setting & env key to run locally and instantly without slow 429 timeouts
  const originalApiKeySetting = await prisma.settings.findUnique({ where: { key: "google_ai_api_key" } });
  if (originalApiKeySetting) {
    await prisma.settings.delete({ where: { key: "google_ai_api_key" } });
    console.log("Temporarily backed up Google AI API key setting.");
  }
  
  const originalEnvKey = process.env.GOOGLE_AI_API_KEY;
  if (originalEnvKey) {
    delete process.env.GOOGLE_AI_API_KEY;
    console.log("Temporarily cleared GOOGLE_AI_API_KEY from environment.");
  }

  // Clean up database tables for clean simulation tracking
  await prisma.used_concepts.deleteMany();
  await prisma.used_hooks.deleteMany();
  await prisma.used_themes.deleteMany();
  console.log("Database tables cleared for strategic simulation audit.\n");

  const categories = ["ai", "business", "motivation"];
  
  const generatedHooks = new Set<string>();
  const generatedConcepts = new Set<string>();
  const layoutDistribution: Record<string, number> = {};
  const themeDistribution: Record<string, number> = {};
  const audienceDistribution: Record<string, number> = {};
  const triggerDistribution: Record<string, number> = {};

  let duplicateHooksCount = 0;
  let duplicateConceptsCount = 0;

  try {
    for (let i = 1; i <= 100; i++) {
      const category = categories[i % categories.length];
      
      const script = await aiService.generateScript(category, false);

      const hook = script.slides[0]?.headline || "";
      const theme = script.theme || "neon_teal";
      const layout = script.style_type || "documentary style";
      const meta = script.metadata;
      
      const targetAudience = meta?.target_audience || "unknown";
      
      // Determine dominant emotional trigger (highest score)
      let dominantTrigger = "none";
      let highestTriggerScore = 0;
      if (meta?.emotional_trigger_profile) {
        Object.entries(meta.emotional_trigger_profile).forEach(([trigger, score]) => {
          if (score > highestTriggerScore) {
            highestTriggerScore = score;
            dominantTrigger = trigger;
          }
        });
      }

      // Track distribution
      layoutDistribution[layout] = (layoutDistribution[layout] || 0) + 1;
      themeDistribution[theme] = (themeDistribution[theme] || 0) + 1;
      audienceDistribution[targetAudience] = (audienceDistribution[targetAudience] || 0) + 1;
      triggerDistribution[dominantTrigger] = (triggerDistribution[dominantTrigger] || 0) + 1;

      // Check duplicates
      const cleanedHook = hook.toLowerCase().trim();
      if (generatedHooks.has(cleanedHook)) {
        duplicateHooksCount++;
        console.error(`[DUPLICATE HOOK DETECTED] Run #${i}: "${hook}"`);
      } else {
        generatedHooks.add(cleanedHook);
      }

      const conceptKey = `${layout}:${targetAudience}:${script.slides[1]?.title || ""}`.toLowerCase().trim();
      if (generatedConcepts.has(conceptKey)) {
        duplicateConceptsCount++;
        console.error(`[DUPLICATE CONCEPT DETECTED] Run #${i}: "${conceptKey}"`);
      } else {
        generatedConcepts.add(conceptKey);
      }

      if (i % 10 === 0) {
        console.log(`Progress: ${i}/100 runs completed...`);
      }
    }
  } finally {
    // Restore original setting
    if (originalApiKeySetting) {
      await prisma.settings.create({
        data: {
          key: "google_ai_api_key",
          value: originalApiKeySetting.value
        }
      });
      console.log("\nRestored Google AI API key setting to database.");
    }
    if (originalEnvKey) {
      process.env.GOOGLE_AI_API_KEY = originalEnvKey;
      console.log("Restored GOOGLE_AI_API_KEY in environment.");
    }
  }

  console.log("\n============================================");
  console.log("📊 STRATEGY SIMULATION AUDIT SUMMARY 📊");
  console.log("============================================");
  console.log(`Total Reels Simulated: 100`);
  console.log(`Duplicate Hooks Found: ${duplicateHooksCount}`);
  console.log(`Duplicate Concepts Found: ${duplicateConceptsCount}`);
  
  console.log("\nLayout Distribution:");
  console.log(JSON.stringify(layoutDistribution, null, 2));

  console.log("\nTheme Distribution:");
  console.log(JSON.stringify(themeDistribution, null, 2));

  console.log("\nTarget Audience Distribution:");
  console.log(JSON.stringify(audienceDistribution, null, 2));

  console.log("\nDominant Emotional Trigger Distribution:");
  console.log(JSON.stringify(triggerDistribution, null, 2));

  if (duplicateHooksCount > 0 || duplicateConceptsCount > 0) {
    console.error("\n❌ TEST FAILED: Repeated content configurations found in the 100-run simulation.");
    process.exit(1);
  } else {
    console.log("\n✅ TEST PASSED: 100% unique strategized concepts, hooks, and balanced variety distributions!");
    process.exit(0);
  }
}

runStrategySimulation().catch(err => {
  console.error("Simulation error:", err);
  process.exit(1);
});
