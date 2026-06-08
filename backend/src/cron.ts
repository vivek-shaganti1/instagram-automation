import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { InstagramService } from "./services/instagram";
import { researchQueue } from "./services/queues";

const prisma = new PrismaClient();
const instagramService = new InstagramService();

// Helper to determine if we should execute aggressive hooks
async function shouldTriggerAggressiveHooks(): Promise<boolean> {
  try {
    const latestMetric = await prisma.analytics.findFirst({
      orderBy: { date: "desc" }
    });

    if (!latestMetric) return false;

    // If actual views are less than 1/3 of the exponential target
    return latestMetric.impressions < (100 / 3);
  } catch (error) {
    console.error("Database error in shouldTriggerAggressiveHooks:", error);
    return false;
  }
}

// 1. Morning Reels (AI): 6:00 AM CST - Adaptive 3-5 Posts
cron.schedule("0 6 * * *", async () => {
  try {
    const latestMetric = await prisma.analytics.findFirst({
      orderBy: { date: "desc" }
    });
    let postCount = 5;
    if (latestMetric && latestMetric.impressions < (100 / 2)) {
      postCount = 3;
    }
    console.log(`⏰ Morning Cron triggered: Queueing ${postCount} AI news Reels at 6:00 AM CST (Adaptive Cadence)...`);
    const aggressiveHooks = await shouldTriggerAggressiveHooks();
    for (let i = 0; i < postCount; i++) {
      await researchQueue.add(`morning-reel-job-${i}`, {
        category: "ai",
        aggressiveHooks,
        storyIndex: i
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("Error in Morning Cron:", error);
  }
}, {
  scheduled: true,
  timezone: "America/Chicago"
});

// 2. Afternoon Reel (Business & Money): 2:00 PM local time
cron.schedule("0 14 * * *", async () => {
  try {
    console.log("⏰ Afternoon Cron triggered: Queueing Business & Money Reel...");
    const aggressiveHooks = await shouldTriggerAggressiveHooks();
    await researchQueue.add("afternoon-reel-job", {
      category: "business",
      aggressiveHooks
    });
  } catch (error) {
    console.error("Error in Afternoon Cron:", error);
  }
});

// 3. Evening Reel (Motivation & Stories): 8:00 PM local time
cron.schedule("0 20 * * *", async () => {
  try {
    console.log("⏰ Evening Cron triggered: Queueing Motivation & Story Reel...");
    const aggressiveHooks = await shouldTriggerAggressiveHooks();
    await researchQueue.add("evening-reel-job", {
      category: "motivation",
      aggressiveHooks
    });
  } catch (error) {
    console.error("Error in Evening Cron:", error);
  }
});

// 4. Analytics Sync Job: Runs every night at 11:45 PM
cron.schedule("45 23 * * *", async () => {
  console.log("⏰ Analytics Sync Cron triggered: Refreshing Instagram Insights...");
  try {
    await instagramService.syncAnalytics();
    console.log("Insights refreshed successfully.");
  } catch (error) {
    console.error("Failed to execute automatic insights sync:", error);
  }
});

console.log("🗓️ Node-cron scheduler initialized successfully.");
