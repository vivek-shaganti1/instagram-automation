import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { InstagramService } from "./services/instagram";
import "./worker"; // Start worker process in same runtime for convenience
import "./cron";   // Start cron scheduler

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const instagramService = new InstagramService();

const PORT = process.env.PORT || 8000;
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");

const reelQueue = new Queue("reel-generation-queue", {
  connection: {
    host: redisHost,
    port: redisPort
  }
});

app.use(cors());
app.use(express.json());

// Expose static output files (mp4 video files)
app.use("/videos", express.static(path.join(__dirname, "..", "output")));

// GET /api/stats
app.get("/api/stats", async (req, res) => {
  try {
    const reels = await prisma.reel.findMany({
      orderBy: { createdAt: "desc" },
      take: 12
    });

    const metrics = await prisma.dailyMetric.findMany({
      orderBy: { date: "asc" },
      take: 30
    });

    // Check if aggressive hooks is toggled
    const lastMetric = metrics[metrics.length - 1];
    const isAggressive = lastMetric ? lastMetric.totalViews < (lastMetric.targetViews / 3) : false;

    res.json({
      posts: reels,
      daily_stats: metrics.reduce((acc: any, cur) => {
        acc[cur.date] = {
          total_views: cur.totalViews,
          target_views: cur.targetViews,
          post_count: cur.postCount
        };
        return acc;
      }, {}),
      settings: {
        aggressive_hooks: isAggressive,
        best_theme: "sunset_glow"
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/post-now
app.post("/api/post-now", async (req, res) => {
  try {
    const { category } = req.body;
    const targetCategory = category || "ai"; // fallback
    
    // Check metric threshold
    const lastMetric = await prisma.dailyMetric.findFirst({
      orderBy: { date: "desc" }
    });
    const aggressiveHooks = lastMetric ? lastMetric.totalViews < (lastMetric.targetViews / 3) : false;

    const job = await reelQueue.add("manual-post-job", {
      category: targetCategory,
      aggressiveHooks
    });

    res.json({ success: true, jobId: job.id, message: `Reel generation for ${targetCategory} queued.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sync-stats
app.post("/api/sync-stats", async (req, res) => {
  try {
    const metric = await instagramService.syncAnalytics();
    res.json({ success: true, data: metric });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
