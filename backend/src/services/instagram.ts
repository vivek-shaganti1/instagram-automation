import axios from "axios";
import { PrismaClient } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();

export class InstagramService {
  async postReel(videoPath: string, caption: string, reelId?: string): Promise<string> {
    const tokenSetting = await prisma.settings.findUnique({ where: { key: "instagram_access_token" } });
    const accountIdSetting = await prisma.settings.findUnique({ where: { key: "instagram_account_id" } });
    const accessToken = tokenSetting?.value || process.env.INSTAGRAM_ACCESS_TOKEN;
    const accountId = accountIdSetting?.value || process.env.INSTAGRAM_ACCOUNT_ID;

    if (!accessToken || !accountId) {
      console.log(`[InstagramService] Graph API keys missing. Falling back to instagrapi upload...`);
      return new Promise((resolve, reject) => {
        const rootEnvPath = require("path").join(__dirname, "..", "..", "..", ".env");
        require("dotenv").config({ path: require("fs").existsSync(rootEnvPath) ? rootEnvPath : require("path").join(__dirname, "..", "..", ".env") });
        const username = process.env.INSTAGRAM_USERNAME;
        const password = process.env.INSTAGRAM_PASSWORD;
        if (!username || !password) {
          return reject(new Error("Instagram username/password missing in .env. Cannot fallback to Instagrapi upload."));
        }

        const getProjectRoot = () => {
          const p2 = path.resolve(__dirname, "..", "..");
          if (require("fs").existsSync(path.join(p2, "main.py"))) return p2;
          const p3 = path.resolve(__dirname, "..", "..", "..");
          if (require("fs").existsSync(path.join(p3, "main.py"))) return p3;
          return "/Users/vivekshaganti/Desktop/Projects/Instagram automation";
        };
        const rootDir = getProjectRoot();
        const pythonBin = path.join(rootDir, "venv", "bin", "python");
        const uploadScript = path.join(rootDir, "upload_reel_cli.py");

        // Escape double quotes in caption for shell
        const safeCaption = caption.replace(/"/g, '\\"');
        const cmd = `"${pythonBin}" "${uploadScript}" --video "${videoPath}" --caption "${safeCaption}" --username "${username}" --password "${password}"`;
        
        require("child_process").exec(cmd, { cwd: rootDir, timeout: 300000, killSignal: 'SIGKILL' }, (error: any, stdout: string, stderr: string) => {
          if (error) {
             console.error("[Instagrapi] Error:", stderr || error.message);
             return reject(new Error(`Instagrapi Upload failed: ${stderr || error.message}`));
          }
          const match = stdout.match(/UPLOAD_SUCCESS:(.*)/);
          if (match) {
             console.log(`[InstagramService] Instagrapi Upload Successful. Media ID: ${match[1]}`);
             return resolve(match[1].trim());
          }
          return reject(new Error(`Instagrapi Upload failed: ${stdout}`));
        });
      });
    }

    try {
      console.log(`[InstagramService] Uploading to Meta Graph API for Account: ${accountId}`);
      const baseUrl = process.env.BASE_URL || "http://localhost:8000";
      const videoUrl = `${baseUrl}/videos/${path.basename(videoPath)}`;

      // 1. Create container
      const containerRes = await axios.post(`https://graph.facebook.com/v19.0/${accountId}/media`, null, {
        params: { video_url: videoUrl, caption: caption, media_type: "REEL", access_token: accessToken }
      });

      const creationId = containerRes.data.id;
      if (!creationId) throw new Error("Failed to create media container.");

      // Wait for Meta
      let isReady = false;
      let attempts = 0;
      while (!isReady && attempts < 15) {
        await new Promise(r => setTimeout(r, 5000));
        attempts++;
        const statusRes = await axios.get(`https://graph.facebook.com/v19.0/${creationId}`, {
          params: { fields: "status_code", access_token: accessToken }
        });
        if (statusRes.data.status_code === "FINISHED") isReady = true;
        else if (statusRes.data.status_code === "ERROR") throw new Error("Meta Graph API ERROR during video processing.");
      }

      if (!isReady) throw new Error("Timed out waiting for Meta processing.");

      // 2. Publish
      const publishRes = await axios.post(`https://graph.facebook.com/v19.0/${accountId}/media_publish`, null, {
        params: { creation_id: creationId, access_token: accessToken }
      });

      const mediaId = publishRes.data.id;
      if (!mediaId) throw new Error("Failed to publish media container.");

      console.log(`[InstagramService] Upload Successful. Media ID: ${mediaId}`);
      return mediaId;
    } catch (error: any) {
      console.error("[InstagramService] Upload Error:", error.response?.data || error.message);
      throw new Error(`Graph API Upload failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async syncAnalytics(): Promise<any> {
    console.log("[syncAnalytics] Checking database for instagram_username and instagram_password...");
    const userSetting = await prisma.settings.findUnique({ where: { key: "instagram_username" } });
    const passSetting = await prisma.settings.findUnique({ where: { key: "instagram_password" } });
    const username = userSetting?.value || process.env.INSTAGRAM_USERNAME || "ai_signal_09";
    const password = passSetting?.value || process.env.INSTAGRAM_PASSWORD;

    if (!username || !password) {
      console.log("[syncAnalytics] Missing INSTAGRAM_USERNAME or INSTAGRAM_PASSWORD in settings and .env. Skipping sync.");
      return { success: false, message: "Instagram username/password missing.", followers: 0, posts: 0, likes: 0 };
    }

    return new Promise((resolve) => {
      const getProjectRoot = () => {
        const p2 = path.resolve(__dirname, "..", "..");
        if (require("fs").existsSync(path.join(p2, "sync_insights_cli.py"))) return p2;
        const p3 = path.resolve(__dirname, "..", "..", "..");
        if (require("fs").existsSync(path.join(p3, "sync_insights_cli.py"))) return p3;
        return "/Users/vivekshaganti/Desktop/Projects/Instagram automation";
      };

      const rootDir = getProjectRoot();
      const pythonBin = path.join(rootDir, "venv", "bin", "python");
      const syncScript = path.join(rootDir, "sync_insights_cli.py");

      const cmd = `"${pythonBin}" "${syncScript}" --username "${username}" --password "${password}"`;
      console.log(`[syncAnalytics] Running command: ${cmd}`);

      require("child_process").exec(cmd, { cwd: rootDir, timeout: 120000 }, async (error: any, stdout: string, stderr: string) => {
        if (error) {
          console.warn("[syncAnalytics] Python script failed with error. Falling back to parsing stdout if available.", error.message);
        }
        if (stderr) {
          console.warn("[syncAnalytics] Python stderr output:\n", stderr);
        }

        const match = stdout.match(/SYNC_SUCCESS\s*\n([\s\S]*)/);
        if (!match) {
          console.error("[syncAnalytics] Could not find SYNC_SUCCESS in stdout:\n", stdout);
          return resolve({
            success: false,
            message: "Failed to locate SYNC_SUCCESS identifier in output.",
            followers: 0,
            posts: 0,
            likes: 0
          });
        }

        try {
          const parsedData = JSON.parse(match[1].trim());
          console.log("[syncAnalytics] Successfully parsed scraped metrics:", JSON.stringify(parsedData));

          if (parsedData.success === false) {
            console.error("[syncAnalytics] Scraper reported failure:", parsedData.error);
            return resolve({
              success: false,
              message: parsedData.error || "Scraper failed to collect insights.",
              source: parsedData.source || "scraper",
              followers: 0,
              posts: 0,
              likes: 0
            });
          }

          // Ensure instagram_accounts record exists to avoid Prisma foreign key violation
          let dbUser = await prisma.users.findFirst();
          if (!dbUser) {
            // Create a default user if none exists
            dbUser = await prisma.users.create({
              data: { email: "admin@saas.com", password: "password" }
            });
          }

          const account = await prisma.instagram_accounts.upsert({
            where: { account_id: username },
            update: { handle: username },
            create: {
              user_id: dbUser.id,
              account_id: username,
              handle: username,
              access_token: "session_scraping"
            }
          });

          // Calculate aggregate metrics from scraped reels
          let totalLikes = 0;
          let totalComments = 0;
          let totalViews = 0;

          if (parsedData.reels && Array.isArray(parsedData.reels)) {
            for (const scrapedReel of parsedData.reels) {
              totalLikes += scrapedReel.likes || 0;
              totalComments += scrapedReel.comments || 0;
              totalViews += scrapedReel.views || 0;

              // Find and update matching generated posts in the database
              let matchedPost = await prisma.generated_posts.findFirst({
                where: {
                  OR: [
                    { caption: { contains: scrapedReel.code } },
                    { caption: { contains: scrapedReel.caption.slice(0, 30) } }
                  ]
                }
              });

              if (!matchedPost) {
                // Fallback: match any UPLOADED post that hasn't been updated yet
                matchedPost = await prisma.generated_posts.findFirst({
                  where: {
                    status: "UPLOADED",
                    views: 0,
                    likes: 0
                  },
                  orderBy: { createdAt: "desc" }
                });
              }

              if (matchedPost) {
                await prisma.generated_posts.update({
                  where: { id: matchedPost.id },
                  data: {
                    views: scrapedReel.views,
                    likes: scrapedReel.likes,
                    comments: scrapedReel.comments
                  }
                });
              }
            }
          }

          // Save metrics to the analytics table
          const today = new Date().toISOString().split("T")[0];
          const analyticsRecord = await prisma.analytics.upsert({
            where: {
              account_id_date: {
                account_id: account.account_id,
                date: today
              }
            },
            update: {
              followers: parsedData.followers || 0,
              reach: totalViews,
              impressions: totalViews,
              likes: totalLikes,
              comments: totalComments
            },
            create: {
              account_id: account.account_id,
              date: today,
              followers: parsedData.followers || 0,
              reach: totalViews,
              impressions: totalViews,
              likes: totalLikes,
              comments: totalComments
            }
          });

          console.log("[syncAnalytics] Saved analytics record successfully:", JSON.stringify(analyticsRecord));

          return resolve({
            success: true,
            followers: parsedData.followers,
            posts: parsedData.media_count || parsedData.reels.length,
            likes: totalLikes
          });

        } catch (parseError: any) {
          console.error("[syncAnalytics] Error parsing or saving scraped stats:", parseError.message);
          return resolve({
            success: false,
            message: `Error processing insights: ${parseError.message}`,
            followers: 0,
            posts: 0,
            likes: 0
          });
        }
      });
    });
  }
}
