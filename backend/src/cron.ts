import cron from "node-cron";
import { Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { InstagramService } from "./services/instagram";

const prisma = new PrismaClient();
const instagramService = new InstagramService();

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");

const reelQueue = new Queue("reel-generation-queue", {
  connection: {
    host: redisHost,
    port: redisPort
  }
});

// Helper to determine if we should execute aggressive hooks
async function shouldTriggerAggressiveHooks(): Promise<boolean> {
  const latestMetric = await prisma.dailyMetric.findFirst({
    orderBy: { date: "desc" }
  });

  if (!latestMetric) return false;

  // If actual views are less than 1/3 of the exponential target
  return latestMetric.totalViews < (latestMetric.targetViews / 3);
}

// 1. Morning Reel (AI): 8:00 AM local time
cron.schedule("0 8 * * *", async () => {
  console.log("⏰ Morning Cron triggered: Queueing AI news Reel...");
  const aggressiveHooks = await shouldTriggerAggressiveHooks();
  await reelQueue.add("morning-reel-job", {
    category: "ai",
    aggressiveHooks
  });
});

// 2. Afternoon Reel (Business & Money): 2:00 PM local time
cron.schedule("0 14 * * *", async () => {
  console.log("⏰ Afternoon Cron triggered: Queueing Business & Money Reel...");
  const aggressiveHooks = await shouldTriggerAggressiveHooks();
  await reelQueue.add("afternoon-reel-job", {
    category: "business",
    aggressiveHooks
  });
});

// 3. Evening Reel (Motivation & Stories): 8:00 PM local time
cron.schedule("0 20 * * *", async () => {
  console.log("⏰ Evening Cron triggered: Queueing Motivation & Story Reel...");
  const aggressiveHooks = await shouldTriggerAggressiveHooks();
  await reelQueue.add("evening-reel-job", {
    category: "motivation",
    aggressiveHooks
  });
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
