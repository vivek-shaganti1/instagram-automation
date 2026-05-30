import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class VideoService {
  private pexelsApiKey: string;
  private elevenLabsApiKey: string;

  constructor() {
    this.pexelsApiKey = process.env.PEXELS_API_KEY || "";
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || "";
  }

  async generateReel(script: any, category: string, outputDir: string, theme?: string, storyIndex?: number): Promise<string> {
    const filename = `reel_${category}_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, filename);

    // Retrieve settings from database
    const apiKeySetting = await prisma.setting.findUnique({ where: { key: "google_ai_api_key" } });
    const apiKey = apiKeySetting?.value || process.env.GOOGLE_AI_API_KEY || "";

    const handleSetting = await prisma.setting.findUnique({ where: { key: "instagram_handle" } });
    const handle = handleSetting?.value || process.env.INSTAGRAM_HANDLE || "@ai_signal_09";

    return new Promise((resolve, reject) => {
      const getProjectRoot = () => {
        const p2 = path.resolve(__dirname, "..", "..");
        if (fs.existsSync(path.join(p2, "main.py"))) return p2;
        const p3 = path.resolve(__dirname, "..", "..", "..");
        if (fs.existsSync(path.join(p3, "main.py"))) return p3;
        return "/Users/vivekshaganti/Desktop/Projects/Instagram automation";
      };
      const rootDir = getProjectRoot();
      const pythonBin = path.join(rootDir, "venv", "bin", "python");
      const cliScript = path.join(rootDir, "render_reel_cli.py");

      const scriptJson = JSON.stringify(script);
      const tempScriptFile = path.join(outputDir, `script_temp_${Date.now()}.json`);
      fs.writeFileSync(tempScriptFile, scriptJson, "utf8");

      console.log(`Running python reel compiler: ${pythonBin} ${cliScript} for category ${category}`);
      
      let cmd = `"${pythonBin}" "${cliScript}" --script-json "${tempScriptFile}" --category "${category}" --output "${outputPath}" --handle "${handle}" --api-key "${apiKey}"`;
      if (theme) {
        cmd += ` --theme "${theme}"`;
      }
      if (storyIndex !== undefined) {
        cmd += ` --story-index "${storyIndex}"`;
      }

      const { exec } = require("child_process");
      exec(cmd, { cwd: rootDir }, (error: any, stdout: string, stderr: string) => {
        console.log("Compiler stdout:", stdout);
        if (stderr) console.error("Compiler stderr:", stderr);

        try {
          if (fs.existsSync(tempScriptFile)) fs.unlinkSync(tempScriptFile);
        } catch (e) {
          console.error("Failed to delete temp script file:", e);
        }

        if (error) {
          console.error("Exec error during Reel compilation:", error);
          return reject(new Error(`Reel compilation failed: ${stderr || error.message}`));
        }

        if (stdout.includes("RENDER_SUCCESS")) {
          resolve(outputPath);
        } else {
          reject(new Error(`Compilation failed. Output: ${stdout}`));
        }
      });
    });
  }

  private async fetchPexelsVideo(category: string, outputDir: string): Promise<string> {
    const defaultClip = path.join(outputDir, "default_clip.mp4");
    if (fs.existsSync(defaultClip)) {
      return defaultClip;
    }

    if (!this.pexelsApiKey) {
      console.warn("PEXELS_API_KEY missing, using fallback blank clip.");
      return this.createBlankVideo(outputDir);
    }

    try {
      let query = "abstract technology";
      if (category === "business") query = "finance planning office";
      if (category === "motivation") query = "running mountain epic";

      const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`;
      const response = await axios.get(url, {
        headers: { Authorization: this.pexelsApiKey }
      });

      const videoFiles = response.data?.videos?.[0]?.video_files;
      const hdVideo = videoFiles?.find((f: any) => f.quality === "hd" || f.width >= 720);
      const downloadUrl = hdVideo?.link || videoFiles?.[0]?.link;

      if (!downloadUrl) throw new Error("No video file link found from Pexels.");

      const clipPath = path.join(outputDir, `pexels_${category}_temp.mp4`);
      const fileWriter = fs.createWriteStream(clipPath);
      const fileResponse = await axios.get(downloadUrl, { responseType: "stream" });

      await new Promise<void>((resolve, reject) => {
        fileResponse.data.pipe(fileWriter);
        fileWriter.on("finish", resolve);
        fileWriter.on("error", reject);
      });

      return clipPath;
    } catch (error) {
      console.error("Failed to fetch Pexels video, using blank fallback:", error);
      return this.createBlankVideo(outputDir);
    }
  }

  private async synthesizeVoiceover(script: any, outputDir: string): Promise<string> {
    const audioPath = path.join(outputDir, "voiceover_temp.mp3");

    // Concatenate slide text for voiceover
    const fullText = script.slides
      .map((s: any) => `${s.headline}. ${s.subheadline || s.body || ""}`)
      .join(" ");

    if (!this.elevenLabsApiKey) {
      console.warn("ELEVENLABS_API_KEY missing, using mock text-to-speech fallback.");
      return this.createMockAudio(audioPath);
    }

    try {
      const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Default Rachel voice
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
      const response = await axios.post(
        url,
        { text: fullText, model_id: "eleven_monolingual_v1" },
        {
          headers: {
            "xi-api-key": this.elevenLabsApiKey,
            "Content-Type": "application/json"
          },
          responseType: "arraybuffer"
        }
      );

      fs.writeFileSync(audioPath, Buffer.from(response.data));
      return audioPath;
    } catch (error) {
      console.error("ElevenLabs TTS failed, using mock audio:", error);
      return this.createMockAudio(audioPath);
    }
  }

  private async compileVideo(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Background music path: output is in backend/output/
      // assets is in the project root
      const musicPath = path.join(path.dirname(outputPath), "..", "..", "assets", "song.mp3");
      const hasMusic = fs.existsSync(musicPath);
      console.log(`Checking background music at: ${musicPath} (Exists: ${hasMusic})`);

      const command = ffmpeg(videoPath)
        .input(audioPath);

      if (hasMusic) {
        command.input(musicPath);
        command.complexFilter([
          // Mix audio tracks: voiceover + background music lowered (at 0.15 volume)
          "[1:a]volume=1.0[voice]; [2:a]volume=0.15[bgmusic]; [voice][bgmusic]amix=inputs=2:duration=first[a]"
        ]);
      }

      command
        .outputOptions([
          "-map 0:v:0",
          hasMusic ? "-map [a]" : "-map 1:a",
          "-c:v libx264",
          "-pix_fmt yuv420p",
          "-shortest",
          "-t 20" // Clamp video length to 20 seconds
        ])
        .on("end", () => {
          console.log("FFmpeg compilation completed successfully.");
          resolve();
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  private createBlankVideo(outputDir: string): string {
    const blankPath = path.join(outputDir, "blank_clip.mp4");
    if (fs.existsSync(blankPath)) return blankPath;
    
    try {
      console.log("Generating local blank black video clip fallback...");
      const { execSync } = require("child_process");
      execSync(`ffmpeg -y -f lavfi -i color=c=black:s=720x1280:r=25 -t 20 -c:v libx264 -pix_fmt yuv420p "${blankPath}"`);
      console.log("Local blank black video clip generated successfully.");
    } catch (error) {
      console.error("Failed to generate blank video clip via ffmpeg:", error);
    }
    return blankPath;
  }

  private createMockAudio(destPath: string): string {
    try {
      console.log("Generating local silent audio fallback...");
      const { execSync } = require("child_process");
      execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 20 -c:a libmp3lame "${destPath}"`);
      console.log("Local silent audio generated successfully.");
    } catch (error) {
      console.error("Failed to generate silent audio via ffmpeg, writing empty file:", error);
      fs.writeFileSync(destPath, Buffer.alloc(0));
    }
    return destPath;
  }
}

