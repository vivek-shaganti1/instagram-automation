import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

export class VideoService {
  private pexelsApiKey: string;
  private elevenLabsApiKey: string;

  constructor() {
    this.pexelsApiKey = process.env.PEXELS_API_KEY || "";
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || "";
  }

  async generateReel(script: any, category: string, outputDir: string): Promise<string> {
    const filename = `reel_${category}_${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, filename);

    // 1. Fetch stock video clip from Pexels
    const videoClipPath = await this.fetchPexelsVideo(category, outputDir);

    // 2. Synthesize audio voiceover from script
    const voiceoverPath = await this.synthesizeVoiceover(script, outputDir);

    // 3. Compile everything together with FFmpeg
    await this.compileVideo(videoClipPath, voiceoverPath, outputPath);

    return outputPath;
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

