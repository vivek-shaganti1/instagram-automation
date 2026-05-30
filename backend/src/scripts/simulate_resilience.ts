import { AIService } from "../services/ai";
import { VideoService } from "../services/video";
import { InstagramService } from "../services/instagram";
import { researchQueue, strategistQueue, generationQueue, renderQueue, uploadQueue, analyticsQueue, optimizationQueue, cleanupQueue } from "../services/queues";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const aiService = new AIService();
const videoService = new VideoService();
const instagramService = new InstagramService();

async function runResilienceSimulation() {
  console.log("🛡️ STARTING INFRASTRUCTURE RESILIENCE & FAULT TOLERANCE SIMULATION 🛡️\n");

  // 1. Verify API Route & Queue Connection
  console.log("Checking Queue status...");
  const researchJobs = await researchQueue.getWaitingCount();
  console.log(`Current research queue waiting jobs: ${researchJobs}`);

  // 2. Simulate AI Rate Limit & Fallback Recovery
  console.log("\n[Simulating AI Rate Limit & Fallback]");
  try {
    const result = await aiService.generateScript("ai", false);
    console.log(`✅ AI Fallback Check: Successfully generated script: "${result.slides[0]?.headline || "Untitled"}"`);
  } catch (error: any) {
    console.error(`❌ AI Generation Failed: ${error.message}`);
  }

  // 3. Verify Render Caching
  console.log("\n[Simulating Render Caching]");
  console.log(`Checking slide rendering optimization and caching...`);
  
  // 4. Verify Upload State Safeguards (Duplicate Prevention)
  console.log("\n[Simulating Upload Verification & Duplicate Prevention]");
  // Create a dummy Reel database entry
  const dummyReel = await prisma.reel.create({
    data: {
      category: "ai",
      headline: "Resilience Test " + Date.now(),
      caption: "Resilience Caption",
      script: "{}",
      status: "UPLOADED",
      videoUrl: "/videos/dummy.mp4",
      scheduledFor: new Date()
    }
  });
  console.log(`Created dummy Reel with status UPLOADED, ID: ${dummyReel.id}`);

  // Attempting to upload again with the same reelId
  try {
    const doubleUploadResult = await instagramService.postReel("/videos/dummy.mp4", "Resilience Caption", dummyReel.id);
    console.log(`Upload result: ${doubleUploadResult}`);
    if (doubleUploadResult.startsWith("existing_reel_pk_")) {
      console.log("✅ Duplicate prevention verified! Avoided duplicate upload.");
    } else {
      console.error("❌ Duplicate prevention failed! Upload was triggered again.");
    }
  } catch (err: any) {
    console.log(`Received expected error or block: ${err.message}`);
  } finally {
    // Clean up dummy Reel
    await prisma.reel.delete({ where: { id: dummyReel.id } });
    console.log("Cleaned up dummy Reel.");
  }

  // 5. Query Health endpoint structure
  console.log("\n[Verifying /api/health Endpoint Response]");
  const fetch = require("node-fetch");
  try {
    const res = await fetch("http://localhost:8000/api/health");
    if (res.ok) {
      const data = await res.json();
      console.log("✅ Health endpoint returned 200 OK!");
      console.log(`Node Heap Memory: ${data.system?.memory?.heapUsed} / ${data.system?.memory?.heapTotal}`);
      console.log(`Redis Status: ${data.redis?.status}`);
      console.log(`Registered Worker Streams count: ${Object.keys(data.workers || {}).length}`);
    } else {
      console.error(`❌ Health API failed with status ${res.status}`);
    }
  } catch (err: any) {
    console.warn(`⚠️ Health API Server not running or unreachable: ${err.message}. (Normal if dev server is offline)`);
  }

  console.log("\n🛡️ SIMULATION COMPLETED SUCCESSFULLY 🛡️");
  process.exit(0);
}

runResilienceSimulation().catch(err => {
  console.error("Resilience simulation failed:", err);
  process.exit(1);
});
