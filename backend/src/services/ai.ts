import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class AIService {
  private client: any;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || "";
    if (apiKey) {
      // Initialize the official SDK
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async generateScript(category: string, aggressiveHooks: boolean = false): Promise<any> {
    if (!this.client) {
      console.warn("GoogleGenAI client not initialized. Using fallback scripts.");
      return this.getFallbackScript(category);
    }

    const handle = process.env.INSTAGRAM_HANDLE || "@ainewsdaily";
    const hookInstruction = aggressiveHooks 
      ? "CRITICAL: The current account views are below target. Write an EXTREMELY AGGRESSIVE, scroll-stopping, psychological curiosity hook for Slide 1 that practically FORCES people to watch. (e.g., 'YOU ARE WASTING YOUR 20s (READ THIS)' or '3 AI TOOLS TO MAKE MONEY WHILE YOU SLEEP')" 
      : "";

    let prompt = "";

    if (category === "ai") {
      prompt = `You are a viral Instagram content creator specializing in AI news. Your posts get 50K+ views because they are clear, structured, and use curiosity hooks.
      ${hookInstruction}
      Create a 5-slide script structure. Return JSON with slides (array of 5 objects containing: slide_num, type ("hook", "what_happened", "key_stats", "why_it_matters", "cta"), label, headline, subheadline, body, stats, future, question, cta, tagline, and image_prompt describing a minimal, warm abstract tech background) and a full caption (with hashtags).`;
    } else if (category === "business") {
      prompt = `You are a viral Instagram business & finance creator. Your posts get 100K+ views covering side hustles, startup ideas, and billionaire habits.
      ${hookInstruction}
      Create a highly engaging 5-slide business reel content flow. Return JSON matching the slides array schema and caption containing money-making hashtags.`;
    } else {
      prompt = `You are a viral Instagram motivational storyteller. Your posts get high retention using emotional stories, lessons on discipline, and comeback stories.
      ${hookInstruction}
      Create a highly emotional and gripping 5-slide motivational reel content flow. Return JSON matching the slides array schema and caption containing motivation hashtags.`;
    }

    try {
      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.85,
        }
      });

      const text = response.text || "";
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini script generation failed, using fallback:", error);
      return this.getFallbackScript(category);
    }
  }

  private getFallbackScript(category: string): any {
    const handle = process.env.INSTAGRAM_HANDLE || "@ainewsdaily";
    if (category === "ai") {
      return {
        slides: [
          { slide_num: 1, type: "hook", label: "AI UPDATE", headline: "AI MODELS SHOW EMOTION", subheadline: "New findings suggest introspection capabilities.", emoji: "🤖", image_prompt: "abstract tech background warm beige tones" },
          { slide_num: 2, type: "what_happened", title: "What Happened", body: "AI models are showing traces of introspection. Researchers have mapped key nodes corresponding to behavioral self-correction.", highlight: "AI correcting itself in real-time.", image_prompt: "soft abstract light background" },
          { slide_num: 3, type: "key_stats", title: "Introspection stats", stats: ["90% — accuracy in reasoning corrections", "2x — higher retention rates", "10M — parameters updated"], image_prompt: "minimal tech grid" },
          { slide_num: 4, type: "why_it_matters", title: "The Big Picture", body: "This brings us one step closer to reliable models that fix their own mistakes without human intervention.", future: "Models will soon self-train autonomously.", image_prompt: "minimal mountain sunrise" },
          { slide_num: 5, type: "cta", question: "Do you trust self-correcting AI?", cta: `Follow ${handle} for daily AI updates 🔔`, tagline: "Stay ahead of the curve", image_prompt: "warm abstract minimal gradient" }
        ],
        caption: `🤖 AI is starting to self-correct!\n\nResearchers just observed models autonomously modifying reasoning behaviors.\n\nWhat do you think? Let us know below!\n\nFollow ${handle} for daily AI news 🚀\n\n#AI #Technology #DeepLearning #ChatGPT #FutureTech`
      };
    } else if (category === "business") {
      return {
        slides: [
          { slide_num: 1, type: "hook", label: "MONEY HUSTLE", headline: "3 AI TOOLS TO MAKE $100/DAY", subheadline: "Easiest ways to make passive income this week.", emoji: "💸", image_prompt: "clean business workspace warm cream tones" },
          { slide_num: 2, type: "what_happened", title: "The Opportunity", body: "AI tools have democratized content creation. You can now build, write, and design assets in seconds for clients who pay premium rates.", highlight: "No prior coding or design skills required.", image_prompt: "soft warm cream laptop" },
          { slide_num: 3, type: "key_stats", title: "Top 3 AI Tools", stats: ["Tool 1 — ChatGPT for copywriting & scripts", "Tool 2 — Canva/Midjourney for graphics", "Tool 3 — ElevenLabs for voiceovers"], image_prompt: "minimal tech diagram warm tones" },
          { slide_num: 4, type: "why_it_matters", title: "Why This Works", body: "Businesses are looking to outsource work to speed up their processes. By using AI, you can deliver high-quality work 10x faster than traditional freelancers.", future: "Earning potential can scale to $3K-$5K/month.", image_prompt: "growing bar chart abstract" },
          { slide_num: 5, type: "cta", question: "Which tool are you trying first?", cta: `Follow ${handle} for daily money ideas 📈`, tagline: "Build your financial freedom", image_prompt: "warm abstract background" }
        ],
        caption: `💸 3 AI tools to make $100/day!\n\nLeverage these tools to jumpstart your earnings:\n1️⃣ ChatGPT\n2️⃣ Midjourney\n3️⃣ ElevenLabs\n\nFollow ${handle} for daily hustles 📈\n\n#sidehustle #passiveincome #entrepreneur #makemoneyonline`
      };
    } else {
      return {
        slides: [
          { slide_num: 1, type: "hook", label: "MINDSET", headline: "DISCIPLINE BEATS TALENT DAILY", subheadline: "Why talent is useless without execution.", emoji: "🔥", image_prompt: "dramatic runner silhouette warm tones" },
          { slide_num: 2, type: "what_happened", title: "The Hard Truth", body: "Talented people fail every day because they rely on ease instead of effort. When you rest on talent, you stop growing. Those who show up daily will eventually surpass you.", highlight: "Consistency always defeats intensity.", image_prompt: "dramatic light beam dark background" },
          { slide_num: 3, type: "key_stats", title: "The 1% Rule", stats: ["Rule 1 — Show up even when you don't feel like it", "Rule 2 — 1% improvement daily is 37x better in a year", "Rule 3 — Focus on the work, ignore the noise"], image_prompt: "minimal growth steps" },
          { slide_num: 4, type: "why_it_matters", title: "The Ultimate Payoff", body: "By building systems of discipline, you take emotion out of the equation. You execute regardless of mood, energy, or circumstances. That is the billionaire mindset.", future: "Success is a slow burn, not an overnight spark.", image_prompt: "distant mountain peak dramatic lighting" },
          { slide_num: 5, type: "cta", question: "Are you showing up today?", cta: `Follow ${handle} for daily drive & mindset 🧠`, tagline: "Unleash your potential", image_prompt: "high contrast warm gradient" }
        ],
        caption: `🔥 Discipline beats talent every single time!\n\nConsistency will take you places talent never could.\n\nAre you showing up today? Share your thoughts below!\n\nFollow ${handle} for daily motivation 🧠\n\n#motivation #mindset #discipline #consistency #success`
      };
    }
  }
}
