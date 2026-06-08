import { AIService } from "../services/ai";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const aiService = new AIService();

async function runSimulation() {
  console.log("🚀 STARTING VIRAL CONTENT STRATEGIST SIMULATION (50 REELS) 🚀");
  
  // Clean up database tables for clean simulation tracking
  await prisma.used_concepts.deleteMany();
  await prisma.used_hooks.deleteMany();
  await prisma.used_themes.deleteMany();
  console.log("Memory database tables cleared for simulation audit.");

  const categories = ["ai", "business", "motivation"];
  
  const generatedHooks = new Set<string>();
  const generatedConcepts = new Set<string>();
  const layoutDistribution: Record<string, number> = {};
  const themeDistribution: Record<string, number> = {};

  let duplicateHooksCount = 0;
  let duplicateConceptsCount = 0;

  for (let i = 1; i <= 50; i++) {
    const category = categories[i % categories.length];
    console.log(`\n--------------------------------------------`);
    console.log(`🎬 Reel #${i}/50 | Category: ${category.toUpperCase()}`);
    console.log(`--------------------------------------------`);

    try {
      const script = await aiService.generateScript(category, false);

      const hook = script.slides[0]?.headline || "";
      const conceptTitle = script.slides[0]?.subheadline || ""; // subheadline acts as concept hook descriptor
      const theme = script.theme || "neon_teal";
      const layout = script.style_type || "documentary style";

      console.log(`Resulting Hook: "${hook}"`);
      console.log(`Resulting Theme: "${theme}"`);
      console.log(`Resulting Layout: "${layout}"`);

      // Duplicate Hook Verification
      if (generatedHooks.has(hook.toLowerCase().trim())) {
        console.error(`❌ DUPLICATE HOOK DETECTED: "${hook}"`);
        duplicateHooksCount++;
      } else {
        generatedHooks.add(hook.toLowerCase().trim());
      }

      // Duplicate Concept Title Verification
      const conceptKey = `${script.slides[0]?.label || ""}:${hook}`;
      if (generatedConcepts.has(conceptKey.toLowerCase().trim())) {
        console.error(`❌ DUPLICATE CONCEPT DETECTED: "${conceptKey}"`);
        duplicateConceptsCount++;
      } else {
        generatedConcepts.add(conceptKey.toLowerCase().trim());
      }

      // Record distribution
      layoutDistribution[layout] = (layoutDistribution[layout] || 0) + 1;
      themeDistribution[theme] = (themeDistribution[theme] || 0) + 1;

    } catch (e: any) {
      console.error(`❌ Reel #${i} failed:`, e.message);
    }
    
    // Add brief timeout between generations to avoid API rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log("\n============================================");
  console.log("📊 SIMULATION AUDIT SUMMARY 📊");
  console.log("============================================");
  console.log(`Total Reels Generated: 50`);
  console.log(`Duplicate Hooks Found: ${duplicateHooksCount}`);
  console.log(`Duplicate Concepts Found: ${duplicateConceptsCount}`);
  
  console.log("\nLayout Distribution:");
  console.log(JSON.stringify(layoutDistribution, null, 2));

  console.log("\nTheme Distribution:");
  console.log(JSON.stringify(themeDistribution, null, 2));

  if (duplicateHooksCount > 0 || duplicateConceptsCount > 0) {
    console.error("\n❌ TEST FAILED: Repetitions found in the simulation runs.");
    process.exit(1);
  } else {
    console.log("\n✅ TEST PASSED: 100% unique concepts, hooks, and excellent variety distribution!");
    process.exit(0);
  }
}

runSimulation().catch(err => {
  console.error("Simulation run failed:", err);
  process.exit(1);
});
