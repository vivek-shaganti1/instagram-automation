import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { AIService } from "./services/ai";
import { VideoService } from "./services/video";
import { InstagramService } from "./services/instagram";
import {
  researchQueue,
  strategistQueue,
  generationQueue,
  renderQueue,
  uploadQueue,
  analyticsQueue,
  optimizationQueue,
  cleanupQueue
} from "./services/queues";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();
const aiService = new AIService();
const videoService = new VideoService();
const instagramService = new InstagramService();

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");

const defaultConnection = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
};

// State mapping / stream details for dashboard health monitoring
export const workerStatuses: Record<string, { status: string; lastActive: string; lastError?: string }> = {};

function updateWorkerStatus(name: string, status: string, error?: string) {
  workerStatuses[name] = {
    status,
    lastActive: new Date().toISOString(),
    lastError: error
  };
}

// 1. Research Worker
export const researchWorker = new Worker(
  "researchQueue",
  async (job: Job) => {
    updateWorkerStatus("researchWorker", "processing");
    const { category, aggressiveHooks, storyIndex } = job.data;
    let reelId = job.data.reelId;

    console.log(`[ResearchWorker] Processing job ${job.id} for category ${category}`);

    try {
      // If reelId is not pre-provided, initialize the DB record
      if (!reelId) {
        const newReel = await prisma.generated_posts.create({
          data: {
            category,
            status: "GENERATING",
            headline: "Researching...",
            script: {},
            caption: "Researching...",
            scheduled_for: new Date(),
          }
        });
        reelId = newReel.id;
      }

      let story = null;
      if (category === "ai") {
        try {
          const getProjectRoot = () => {
            const p2 = path.resolve(__dirname, "..", "..");
            if (fs.existsSync(path.join(p2, "backend", "python", "main.py"))) return p2;
            const p3 = path.resolve(__dirname, "..", "..", "..");
            if (fs.existsSync(path.join(p3, "backend", "python", "main.py"))) return p3;
            return "/Users/vivekshaganti/Desktop/Projects/Instagram automation";
          };
          const rootDir = getProjectRoot();
          const pythonBin = path.join(rootDir, "venv", "bin", "python");
          const researchScript = path.join(rootDir, "backend", "python", "research_cli.py");

          console.log(`Running Python news researcher: ${pythonBin} ${researchScript}`);
          const { exec } = require("child_process");
          const apiKeySetting = await prisma.settings.findUnique({ where: { key: "google_ai_api_key" } });
          const apiKey = apiKeySetting?.value || "";

          const stdout = await new Promise<string>((resolve, reject) => {
            exec(`"${pythonBin}" "${researchScript}" "${apiKey}"`, { cwd: rootDir, encoding: "utf8" }, (err: any, out: string) => {
              if (err) return reject(err);
              resolve(out);
            });
          });
          const jsonMatch = stdout.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            const stories = JSON.parse(jsonMatch[0]);
            if (Array.isArray(stories) && stories.length > 0) {
              const idx = storyIndex !== undefined ? parseInt(storyIndex as string) : 0;
              story = stories[idx % stories.length];
              console.log(`Successfully fetched researched story: "${story.headline}"`);
            }
          }
        } catch (e: any) {
          console.error("[ResearchWorker] Research failed, using fallback:", e.message);
        }
      }

      // Pass to strategistQueue
      await strategistQueue.add(`strategy-job-${reelId}`, {
        reelId,
        category,
        aggressiveHooks,
        storyIndex,
        story
      });
    } catch (error: any) {
      console.error(`[ResearchWorker] Fatal error for job ${job.id}:`, error);
      if (reelId) {
        await prisma.generated_posts.update({
          where: { id: reelId },
          data: { status: "FAILED", error: error.message }
        });
      }
      throw error;
    } finally {
      updateWorkerStatus("researchWorker", "idle");
    }
  },
  { connection: defaultConnection, lockDuration: 300000 }
);

// 2. Strategist Worker
export const strategistWorker = new Worker(
  "strategistQueue",
  async (job: Job) => {
    updateWorkerStatus("strategistWorker", "processing");
    const { reelId, category, aggressiveHooks, storyIndex, story } = job.data;
    console.log(`[StrategistWorker] Conceptualizing Reel ${reelId}`);

    try {
      // Strategist performs step A and B context prep (concept selection)
      // For simplicity, we forward the context to the generation queue where the script is generated
      await generationQueue.add(`generation-job-${reelId}`, {
        reelId,
        category,
        aggressiveHooks,
        storyIndex,
        story
      });
    } catch (error: any) {
      console.error(`[StrategistWorker] Failed for Reel ${reelId}:`, error);
      await prisma.generated_posts.update({
        where: { id: reelId },
        data: { status: "FAILED", error: error.message }
      });
      throw error;
    } finally {
      updateWorkerStatus("strategistWorker", "idle");
    }
  },
  { connection: defaultConnection }
);

// 3. Generation Worker
export const generationWorker = new Worker(
  "generationQueue",
  async (job: Job) => {
    updateWorkerStatus("generationWorker", "processing");
    const { reelId, category, aggressiveHooks, story } = job.data;
    console.log(`[GenerationWorker] Compiling AI script for Reel ${reelId}`);

    try {
      // Generate Script via LLM / Fallbacks
      const script = await aiService.generateScript(category, aggressiveHooks, story);
      const headline = script.slides?.[0]?.headline || "AI Reel";
      const caption = script.caption || "";

      await prisma.generated_posts.update({
        where: { id: reelId },
        data: { headline, script: script as any, caption }
      });

      // Pass to renderQueue
      await renderQueue.add(`render-job-${reelId}`, {
        reelId,
        script,
        category,
        theme: script.theme || "bloomberg_dark",
        storyIndex: job.data.storyIndex
      });
    } catch (error: any) {
      console.error(`[GenerationWorker] Failed for Reel ${reelId}:`, error);
      await prisma.generated_posts.update({
        where: { id: reelId },
        data: { status: "FAILED", error: error.message }
      });
      throw error;
    } finally {
      updateWorkerStatus("generationWorker", "idle");
    }
  },
  { connection: defaultConnection }
);

// 4. Render Worker
export const renderWorker = new Worker(
  "renderQueue",
  async (job: Job) => {
    updateWorkerStatus("renderWorker", "processing");
    const { reelId, script, category, theme, storyIndex } = job.data;
    console.log(`[RenderWorker] Commencing FFmpeg render for Reel ${reelId}`);

    try {
      const outputDir = path.join(__dirname, "..", "output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      let videoPath = "";
      let renderAttempts = 0;
      const maxRenderAttempts = 3;

      while (renderAttempts < maxRenderAttempts) {
        try {
          videoPath = await videoService.generateReel(script, category, outputDir, theme, storyIndex);
          break; // Success
        } catch (e: any) {
          renderAttempts++;
          console.error(`[RenderWorker] Render attempt ${renderAttempts} failed:`, e.message);
          if (renderAttempts >= maxRenderAttempts) throw e;
          // Wait before retry
          await new Promise(r => setTimeout(r, 5000));
        }
      }

      await prisma.generated_posts.update({
        where: { id: reelId },
        data: { status: "RENDERED" }
      });

      // Pass to uploadQueue with a randomized jitter delay (1 to 3 hours)
      // to mimic human posting behavior and avoid automation detection
      // DISABLED for testing/immediate manual execution: set to 10 seconds
      const delayMs = 10000;
      console.log(`[RenderWorker] Upload for Reel ${reelId} delayed by ${Math.round(delayMs / 1000)} seconds.`);

      await uploadQueue.add(`upload-job-${reelId}`, {
        reelId,
        videoPath,
        caption: script.caption || ""
      }, { delay: delayMs });
    } catch (error: any) {
      console.error(`[RenderWorker] Failed for Reel ${reelId}:`, error);
      await prisma.generated_posts.update({
        where: { id: reelId },
        data: { status: "FAILED", error: error.message }
      });
      throw error;
    } finally {
      updateWorkerStatus("renderWorker", "idle");
    }
  },
  { 
    connection: defaultConnection,
    concurrency: 1,
    lockDuration: 600000 // 10 minutes to prevent stalled job restarts
  }
);

// 5. Upload Worker
export const uploadWorker = new Worker(
  "uploadQueue",
  async (job: Job) => {
    updateWorkerStatus("uploadWorker", "processing");
    const { reelId, videoPath, caption } = job.data;
    console.log(`[UploadWorker] Initiating upload flow for Reel ${reelId}`);

    // Duplicate upload prevention check using atomic state locking
    const uploadLock = await prisma.$transaction(async (tx) => {
      const currentReel = await tx.generated_posts.findUnique({ where: { id: reelId } });
      if (!currentReel || currentReel.status === "UPLOADED") {
        return { shouldUpload: false, status: currentReel?.status };
      }
      const updated = await tx.generated_posts.update({
        where: { id: reelId },
        data: { status: "UPLOADING" }
      });
      return { shouldUpload: true, status: updated.status };
    });

    if (!uploadLock.shouldUpload) {
      console.warn(`[UploadWorker] Duplicate prevention: Reel ${reelId} is already ${uploadLock.status}. Skipping upload.`);
      return;
    }

    try {
      const baseUrl = process.env.BASE_URL || "http://localhost:8000";
      const localVideoUrl = `${baseUrl}/videos/${path.basename(videoPath)}`;
      const instagramPostId = await instagramService.postReel(videoPath, caption, reelId);

      await prisma.generated_posts.update({
        where: { id: reelId },
        data: {
          status: "UPLOADED",
          posted_at: new Date(),
          video_url: localVideoUrl
        }
      });

      console.log(`[UploadWorker] Upload verified successfully. Post ID: ${instagramPostId}`);

      // Trigger Analytics sync
      await analyticsQueue.add(`analytics-sync-${reelId}`, { reelId });
    } catch (uploadErr: any) {
      console.error(`[UploadWorker] Failed to upload Reel ${reelId}:`, uploadErr);
      await prisma.generated_posts.update({
        where: { id: reelId },
        data: { status: "FAILED", error: uploadErr.message }
      });
      throw uploadErr; // Propagate error so BullMQ can handle retries and logs
    }

    updateWorkerStatus("uploadWorker", "idle");
  },
  { 
    connection: defaultConnection,
    concurrency: 1,
    lockDuration: 300000, // 5 minutes to prevent stalled job restarts during upload
    limiter: {
      max: 500,           // Increased from 5 for testing
      duration: 86400000 // Per 24 hours
    }
  }
);

// 6. Analytics Worker
export const analyticsWorker = new Worker(
  "analyticsQueue",
  async (job: Job) => {
    updateWorkerStatus("analyticsWorker", "processing");
    const { reelId } = job.data;
    console.log(`[AnalyticsWorker] Syncing insights for Reel: ${reelId || "global"}`);

    try {
      await instagramService.syncAnalytics();

      // Trigger learning optimizations
      await optimizationQueue.add("optimization-job", {});
    } catch (error: any) {
      console.error(`[AnalyticsWorker] Failed:`, error);
      updateWorkerStatus("analyticsWorker", "failed", error.message);
      throw error;
    }

    updateWorkerStatus("analyticsWorker", "idle");
  },
  { connection: defaultConnection }
);

// 7. Optimization Worker
export const optimizationWorker = new Worker(
  "optimizationQueue",
  async (job: Job) => {
    updateWorkerStatus("optimizationWorker", "processing");
    console.log(`[OptimizationWorker] Refining strategist rules and tracking fatigue thresholds`);
    
    try {
      // Perform cleanup checks
      await cleanupQueue.add("cleanup-job", {});
    } catch (error: any) {
      console.error(`[OptimizationWorker] Failed:`, error);
      updateWorkerStatus("optimizationWorker", "failed", error.message);
      throw error;
    }
    
    updateWorkerStatus("optimizationWorker", "idle");
  },
  { connection: defaultConnection }
);

// 8. Cleanup Worker
export const cleanupWorker = new Worker(
  "cleanupQueue",
  async (job: Job) => {
    updateWorkerStatus("cleanupWorker", "processing");
    console.log(`[CleanupWorker] Starting temp storage purge`);

    try {
      const outputDir = path.join(__dirname, "..", "output");
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        const now = Date.now();
        const cutoff = 24 * 3600 * 1000; // 24 hours

        files.forEach(file => {
          const filePath = path.join(outputDir, file);
          try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > cutoff) {
              fs.unlinkSync(filePath);
              console.log(`[CleanupWorker] Purged stale rendering file: ${file}`);
            }
          } catch (e: any) {
            console.error(`[CleanupWorker] Failed to delete ${file}:`, e.message);
          }
        });
      }
    } catch (error: any) {
      console.error(`[CleanupWorker] Failed:`, error);
      updateWorkerStatus("cleanupWorker", "failed", error.message);
      throw error;
    }

    updateWorkerStatus("cleanupWorker", "idle");
  },
  { connection: defaultConnection }
);

// Setup error listeners for self-healing status reporting
const allWorkers = [
  { name: "researchWorker", worker: researchWorker },
  { name: "strategistWorker", worker: strategistWorker },
  { name: "generationWorker", worker: generationWorker },
  { name: "renderWorker", worker: renderWorker },
  { name: "uploadWorker", worker: uploadWorker },
  { name: "analyticsWorker", worker: analyticsWorker },
  { name: "optimizationWorker", worker: optimizationWorker },
  { name: "cleanupWorker", worker: cleanupWorker },
];

allWorkers.forEach(({ name, worker }) => {
  updateWorkerStatus(name, "idle");

  worker.on("completed", (job) => {
    console.log(`[Worker - ${name}] Job ${job.id} completed.`);
    updateWorkerStatus(name, "idle");
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker - ${name}] Job ${job?.id} failed:`, err.message);
    updateWorkerStatus(name, "failed", err.message);
  });
});
