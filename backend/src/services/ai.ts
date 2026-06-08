import { PrismaClient } from "@prisma/client";
import { groqRequest } from "./groqClient";
import { TrendService } from "./trends";

const prisma = new PrismaClient();
const trendService = new TrendService();

export interface SlideContent {
  slide_num: number;
  type: string;
  label?: string;
  headline?: string;
  subheadline?: string;
  title?: string;
  body?: string;
  highlight?: string;
  stats?: string[];
  question?: string;
  cta?: string;
  tagline?: string;
  future?: string;
  image_prompt: string;
}

export interface GeneratedScript {
  slides: SlideContent[];
  caption: string;
  theme?: string;
  style_type?: string;
  metadata?: {
    viral_probability: number;
    target_audience: string;
    emotional_trigger_profile: Record<string, number>;
    hook_retention_prediction: {
      scroll_stop: number;
      retention: number;
      comment: number;
      save: number;
      share: number;
    };
    shareability_prediction: number;
    save_probability: number;
    trend_momentum_score: number;
    confidence_score: number;
  };
}

export class AIService {


  constructor() {}

  async generateScript(category: string, aggressiveHooks: boolean = false, story?: any): Promise<GeneratedScript> {
    const apiKeySetting = await prisma.settings.findUnique({ where: { key: "google_ai_api_key" } });
    const groqKeySetting = await prisma.settings.findUnique({ where: { key: "groq_api_key" } });
    const apiKey = apiKeySetting?.value || groqKeySetting?.value || process.env.GROQ_API_KEY || process.env.GOOGLE_AI_API_KEY || "";

    if (!apiKey) {
      throw new Error("AI API key not configured. Cannot generate script.");
    }

    process.env.GROQ_API_KEY = apiKey;

    const handleSetting = await prisma.settings.findUnique({ where: { key: "instagram_handle" } });
    const handle = handleSetting?.value || process.env.INSTAGRAM_HANDLE || "@ai_signal_09";

    // 1. Memory retrieval
    const pastConcepts = await prisma.used_concepts.findMany({
      where: { category },
      orderBy: { createdAt: "desc" },
      take: 15
    });

    const pastHooks = await prisma.used_hooks.findMany({
      orderBy: { createdAt: "desc" },
      take: 15
    });

    // Fetch performance feedback context
    const allReelsWithPerformance = await prisma.generated_posts.findMany({
      where: { status: "UPLOADED" },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    const reelIds = allReelsWithPerformance.map(r => r.id);
    const performanceMetrics: any[] = [];

    const performanceMap = new Map();
    const scoredReels = allReelsWithPerformance.map(r => {
      const metric = performanceMap.get(r.id);
      const views = r.views || 0;
      const likes = r.likes || 0;
      const comments = r.comments || 0;
      const shares = metric?.shares || 0;
      const saves = metric?.saves || 0;
      const retention = metric?.retention || 0.5;
      const engagement = metric?.engagement || 0;
      
      let hook = "";
      let theme = "";
      let styleType = "";
      try {
        const scriptJson = r.script as any;
        hook = scriptJson.slides?.[0]?.headline || "";
        theme = scriptJson.theme || "";
        styleType = scriptJson.style_type || "";
      } catch (e) {}

      return {
        id: r.id,
        headline: r.headline,
        views,
        engagement,
        retention,
        shares,
        saves,
        hook,
        theme,
        styleType,
        category: r.category
      };
    });

    const sortedReels = [...scoredReels].sort((a, b) => b.views - a.views);
    const topReels = sortedReels.slice(0, 5);
    const bottomReels = [...scoredReels].sort((a, b) => a.views - b.views).slice(0, 5);

    let closedLoopContext = "CLOSED-LOOP FEEDBACK: Here is how past Reels performed:\n";
    if (topReels.length > 0) {
      closedLoopContext += "\nTOP PERFORMERS (Use these as inspiration for successful topics, themes, and hooks):\n";
      topReels.forEach(r => {
        closedLoopContext += `- Hook: "${r.hook}" | Theme: "${r.theme}" | Style/Layout: "${r.styleType}" | Views: ${r.views} | Retention: ${(r.retention * 100).toFixed(1)}% | Saves: ${r.saves}\n`;
      });
    }
    if (bottomReels.length > 0) {
      closedLoopContext += "\nBOTTOM PERFORMERS (AVOID these topics, themes, styles, and hooks. Saturated or poor retention):\n";
      bottomReels.forEach(r => {
        closedLoopContext += `- Hook: "${r.hook}" | Theme: "${r.theme}" | Style/Layout: "${r.styleType}" | Views: ${r.views} | Retention: ${(r.retention * 100).toFixed(1)}% | Saves: ${r.saves}\n`;
      });
    }

    // 2. Fetch trends
    const trends = await trendService.fetchLatestTrends();
    const trendContext = trends.map(t => `- [${t.source}] Keyword: "${t.keyword}", Controversy: "${t.controversy}"`).join("\n");

    let attempt = 0;
    const maxAttempts = 5;

    while (attempt < maxAttempts) {
      attempt++;
      console.log(`Autonomous Content Strategist - Strategy Generation Attempt ${attempt}/${maxAttempts}`);

      try {
        // Step A: Generate 20 concepts and rank them (Viral Opportunity Engine)
        const conceptsPrompt = `
        You are an elite Instagram growth analyst and viral psychology researcher.
        We need to generate a concept for an Instagram Reel in the category: "${category}".
        
        Recent trends:
        ${trendContext}

        ${closedLoopContext}

        Exclusion list of recent concepts (DO NOT repeat):
        ${pastConcepts.map(c => `- ${c.title}: ${c.description}`).join("\n")}

        Generate exactly 20 distinct, highly creative, attention-engineering concepts.
        Provide scores from 0 to 100 for:
        - virality_probability
        - emotional_intensity
        - shareability
        - controversy
        - curiosity_gap
        - retention_probability
        - audience_relatability
        - urgency
        - novelty
        - trend_momentum

        Select a target audience segment for each concept: (developers, startup founders, students, freelancers, agency owners, AI enthusiasts, productivity audience, self-improvement audience).

        Return ONLY a JSON object:
        {
          "concepts": [
            {
              "title": "Title",
              "description": "Description",
              "target_audience": "developers",
              "psychology": {
                "virality_probability": 85, "emotional_intensity": 90, "shareability": 80, "controversy": 40, "curiosity_gap": 95, "retention_probability": 85, "audience_relatability": 75, "urgency": 60, "novelty": 90, "trend_momentum": 88
              }
            }
          ]
        }
        `;

        const conceptRes = await groqRequest<{ concepts: any[] }>(conceptsPrompt, "llama-3.3-70b-versatile");
        if (!conceptRes || !conceptRes.concepts || conceptRes.concepts.length === 0) {
          throw new Error("Failed to generate concepts structure");
        }

        // Rank and select the highest predicted performer
        // Rank and select the highest predicted performer (weighted for high-growth attributes)
        const scored = conceptRes.concepts.map(c => {
          const p = c.psychology;
          const score = (p.virality_probability * 1.0 + p.emotional_intensity * 1.2 + p.shareability * 2.5 + p.curiosity_gap * 1.8 + p.retention_probability * 2.0 + p.novelty * 1.5 + p.trend_momentum * 1.3) / 10.3;
          return { ...c, compositeScore: score };
        });

        scored.sort((a, b) => b.compositeScore - a.compositeScore);
        const selectedConcept = scored[0];
        console.log(`Selected Concept: "${selectedConcept.title}" (Predicted Score: ${selectedConcept.compositeScore.toFixed(1)}, Target: ${selectedConcept.target_audience})`);

        // Step B: Generate 20 hooks, rank, and predict retention
        const hookPrompt = `
        Concept Title: "${selectedConcept.title}"
        Concept Description: "${selectedConcept.description}"
        Target Audience: "${selectedConcept.target_audience}"

        ${closedLoopContext}

        Avoid these recently used hooks:
        ${pastHooks.map(h => `- ${h.hook_text}`).join("\n")}

        Generate exactly 20 hooks for Slide 1, tailored to the target audience profile.
        For each hook, predict (0 to 100):
        - scroll_stop
        - retention
        - comment
        - save
        - share

        Return ONLY a JSON object:
        {
          "hooks": [
            {
              "text": "Hook text",
              "scores": {
                "scroll_stop": 95, "retention": 90, "comment": 80, "save": 75, "share": 85
              }
            }
          ]
        }
        `;

        const hookRes = await groqRequest<{ hooks: any[] }>(hookPrompt, "llama-3.3-70b-versatile");
        if (!hookRes || !hookRes.hooks || hookRes.hooks.length === 0) {
          throw new Error("Failed to generate hooks list");
        }

        const scoredHooks = hookRes.hooks.map(h => {
          const s = h.scores;
          const score = (s.scroll_stop * 1.5 + s.retention * 2.0 + s.comment * 1.0 + s.save * 2.2 + s.share * 2.5) / 9.2;
          return { ...h, compositeHookScore: score };
        });

        scoredHooks.sort((a, b) => b.compositeHookScore - a.compositeHookScore);
        const selectedHook = scoredHooks[0];
        console.log(`Selected Hook: "${selectedHook.text}" (Hook Score: ${selectedHook.compositeHookScore.toFixed(1)})`);

        // Step C: Content Memory Engine - Similarity Audit
        let maxSimilarity = 0;
        if (pastConcepts.length > 0 || pastHooks.length > 0) {
          const similarityPrompt = `
          Compare candidate with history.
          Candidate Title: "${selectedConcept.title}"
          Candidate Description: "${selectedConcept.description}"
          Candidate Hook: "${selectedHook.text}"

          History of Past Concepts:
          ${pastConcepts.map(c => `- ${c.title}: ${c.description}`).join("\n")}

          History of Past Hooks:
          ${pastHooks.map(h => `- ${h.hook_text}`).join("\n")}

          Evaluate semantic similarity (0 to 100).
          Return ONLY: { "similarityScore": 45, "reason": "reason" }
          `;

          const simRes = await groqRequest<{ similarityScore: number; reason: string }>(similarityPrompt, "llama-3.3-70b-versatile");
          maxSimilarity = simRes?.similarityScore || 0;
          console.log(`Strategist Similarity check: ${maxSimilarity}% (${simRes?.reason || 'no reason'})`);
        }

        if (maxSimilarity > 60) {
          console.warn(`Similarity check failed (${maxSimilarity}%). Regenerating...`);
          continue;
        }

        // Step D: Choose layout style (Variety System)
        const layouts = [
          "documentary style", "hidden truth", "shocking statistics", "future prediction",
          "founder breakdown", "AI war analysis", "contrarian opinion", "startup teardown",
          "billionaire psychology", "productivity myth", "emotional storytelling"
        ];
        const lastReel = await prisma.generated_posts.findFirst({
          where: { category },
          orderBy: { createdAt: "desc" }
        });
        let lastLayout = "";
        try {
          if (lastReel && lastReel.script) {
            lastLayout = (lastReel.script as any).style_type || "";
          }
        } catch (e) {}

        const availableLayouts = layouts.filter(l => l !== lastLayout);
        const selectedLayout = availableLayouts[Math.floor(Math.random() * availableLayouts.length)];

        // Step E: Select visual theme
        const themes = ["apple_minimal", "bloomberg_dark", "startup_editorial", "cyber_documentary", "luxury_white", "midnight_strategy", "founder_mode", "ai_war_room", "modern_finance", "intelligence_briefing"];
        const selectedTheme = themes[Math.floor(Math.random() * themes.length)];

        // Step F: Build complete slide script
        const hookInstruction = aggressiveHooks 
          ? "CRITICAL: Current views are low. Apply hyper-aggressive curiosity loop for Slide 1."
          : "";

        const finalPrompt = `
        Draft a complete, engaging 5-slide Reel content flow based on:
        Category: ${category}
        Layout Style: ${selectedLayout}
        Selected Hook: ${selectedHook.text}
        Concept: ${selectedConcept.title} - ${selectedConcept.description}
        Target Audience Profile: ${selectedConcept.target_audience}
        
        ${hookInstruction}

        HUMANIZATION REQUIREMENTS:
        1. Write the caption in a natural, highly relatable, conversational tone. Do not sound corporate or robotic.
        2. Rotate your hashtag clusters. DO NOT use generic hashtag sets every time. Use a varied mix of exactly 4 broad, 4 niche, and 2 community-specific tags.
        3. Do not use generic structures like "Here are 3 things...", instead use authentic storytelling framing and natural text formatting.

        You MUST return JSON with the exact structure:
        {
          "slides": [
            { "slide_num": 1, "type": "hook", "label": "LABEL", "headline": "${selectedHook.text}", "subheadline": "subheadline loop", "image_prompt": "Minimal abstract background matching style: ${selectedTheme}" },
            { "slide_num": 2, "type": "what_happened", "title": "Section Title", "body": "details", "highlight": "key point", "image_prompt": "description" },
            { "slide_num": 3, "type": "key_stats", "title": "Stats Title", "stats": ["stat 1", "stat 2", "stat 3"], "image_prompt": "description" },
            { "slide_num": 4, "type": "why_it_matters", "title": "Why it Matters", "body": "explanation", "future": "future prediction", "image_prompt": "description" },
            { "slide_num": 5, "type": "cta", "question": "engaging question", "cta": "Follow ${handle} for more", "tagline": "brand hook", "image_prompt": "description" }
          ],
          "caption": "Human-sounding post caption with rotating hashtags"
        }
        `;

        const scriptData = await groqRequest<GeneratedScript>(finalPrompt, "llama-3.3-70b-versatile");
        if (scriptData && scriptData.slides && scriptData.slides.length > 0) {
          scriptData.theme = selectedTheme;
          scriptData.style_type = selectedLayout;
          
          // Package strategic metadata
          scriptData.metadata = {
            viral_probability: selectedConcept.psychology.virality_probability,
            target_audience: selectedConcept.target_audience,
            emotional_trigger_profile: {
              curiosity: selectedConcept.psychology.curiosity_gap,
              fear: selectedConcept.psychology.fear,
              aspiration: selectedConcept.psychology.aspiration,
              controversy: selectedConcept.psychology.controversy,
              surprise: selectedConcept.psychology.surprise,
              social_proof: selectedConcept.psychology.social_proof,
              authority: selectedConcept.psychology.authority,
              urgency: selectedConcept.psychology.urgency
            },
            hook_retention_prediction: {
              scroll_stop: selectedHook.scores.scroll_stop,
              retention: selectedHook.scores.retention,
              comment: selectedHook.scores.comment,
              save: selectedHook.scores.save,
              share: selectedHook.scores.share
            },
            shareability_prediction: selectedConcept.psychology.shareability,
            save_probability: selectedHook.scores.save,
            trend_momentum_score: selectedConcept.psychology.trend_momentum,
            confidence_score: Math.round(selectedConcept.compositeScore)
          };

          // Record memory in Database
          await prisma.used_concepts.create({
            data: {
              title: selectedConcept.title,
              description: selectedConcept.description,
              category
            }
          });

          await prisma.used_hooks.create({
            data: {
              hook_text: selectedHook.text,
              viral_score: selectedHook.compositeHookScore
            }
          });

          await prisma.used_themes.create({
            data: {
              theme_name: selectedTheme
            }
          });

          console.log("Memory successfully updated with strategist metadata.");
          return scriptData;
        }

      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
      }
    }

    throw new Error("Strategist failed to generate script after maximum attempts.");
  }
}
