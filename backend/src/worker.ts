import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { AIService } from "./services/ai";
import { VideoService } from "./services/video";
import { InstagramService } from "./services/instagram";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();
const aiService = new AIService();
const videoService = new VideoService();
const instagramService = new InstagramService();

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");

export const reelQueueWorker = new Worker(
  "reel-generation-queue",
  async (job: Job) => {
    const { category, aggressiveHooks } = job.data;
    console.log(`Processing Reel upload job ID ${job.id} for category ${category}...`);

    // Create a database entry
    const reel = await prisma.reel.create({
      data: {
        category,
        status: "GENERATING",
        headline: "Generating...",
        script: {},
        caption: "Generating...",
        scheduledFor: new Date(),
      }
    });

    try {
      // 1. Generate Script
      const script = await aiService.generateScript(category, aggressiveHooks);
      const headline = script.slides?.[0]?.headline || "AI Reel";
      const caption = script.caption || "";

      await prisma.reel.update({
        where: { id: reel.id },
        data: { headline, script, caption }
      });

      // 2. Generate video
      const outputDir = path.join(__dirname, "..", "output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const videoPath = await videoService.generateReel(script, category, outputDir);

      await prisma.reel.update({
        where: { id: reel.id },
        data: { status: "RENDERED" }
      });

      // 3. Post to Instagram
      const instagramUrl = `https://mock-storage.com/${path.basename(videoPath)}`; // Cloud storage helper mock
      const instagramPostId = await instagramService.postReel(instagramUrl, caption);

      await prisma.reel.update({
        where: { id: reel.id },
        data: {
          status: "UPLOADED",
          postedAt: new Date(),
          videoUrl: instagramUrl
        }
      });

      console.log(`Job ${job.id} successfully completed. Reel ID: ${instagramPostId}`);
      return { success: true, reelId: reel.id, instagramPostId };

    } catch (error: any) {
      console.error(`Reel generation failed for job ${job.id}:`, error);
      await prisma.reel.update({
        where: { id: reel.id },
        data: {
          status: "FAILED",
          error: error.message || "Unknown rendering error"
        }
      });
      throw error;
    }
  },
  {
    connection: {
      host: redisHost,
      port: redisPort
    }
  }
);

reelQueueWorker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed successfully.`);
});

reelQueueWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});
