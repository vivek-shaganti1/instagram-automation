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
  private static usedFallbackHooks = new Set<string>();
  private static usedFallbackConcepts = new Set<string>();

  constructor() {}

  async generateScript(category: string, aggressiveHooks: boolean = false, story?: any): Promise<GeneratedScript> {
    const apiKeySetting = await prisma.setting.findUnique({ where: { key: "google_ai_api_key" } });
    const apiKey = apiKeySetting?.value || process.env.GOOGLE_AI_API_KEY || "";

    if (!apiKey) {
      console.warn("AI API key not configured. Using fallback script.");
      return this.getFallbackScript(category);
    }

    process.env.GROQ_API_KEY = apiKey;

    const handleSetting = await prisma.setting.findUnique({ where: { key: "instagram_handle" } });
    const handle = handleSetting?.value || process.env.INSTAGRAM_HANDLE || "@ai_signal_09";

    // 1. Memory retrieval
    const pastConcepts = await prisma.usedConcept.findMany({
      where: { category },
      orderBy: { createdAt: "desc" },
      take: 15
    });

    const pastHooks = await prisma.usedHook.findMany({
      orderBy: { createdAt: "desc" },
      take: 15
    });

    // Fetch performance feedback context
    const allReelsWithPerformance = await prisma.reel.findMany({
      where: { status: "UPLOADED" },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    const reelIds = allReelsWithPerformance.map(r => r.id);
    const performanceMetrics = await prisma.performanceMetric.findMany({
      where: { reelId: { in: reelIds } }
    });

    const performanceMap = new Map(performanceMetrics.map(m => [m.reelId, m]));
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
        ${pastHooks.map(h => `- ${h.hookText}`).join("\n")}

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
          ${pastHooks.map(h => `- ${h.hookText}`).join("\n")}

          Evaluate semantic similarity (0 to 100).
          Return ONLY: { "similarityScore": 45, "reason": "reason" }
          `;

          const simRes = await groqRequest<{ similarityScore: number; reason: string }>(similarityPrompt, "llama-3.3-70b-versatile");
          maxSimilarity = simRes.similarityScore || 0;
          console.log(`Strategist Similarity check: ${maxSimilarity}% (${simRes.reason})`);
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
        const lastReel = await prisma.reel.findFirst({
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
          await prisma.usedConcept.create({
            data: {
              title: selectedConcept.title,
              description: selectedConcept.description,
              category
            }
          });

          await prisma.usedHook.create({
            data: {
              hookText: selectedHook.text,
              viralScore: selectedHook.compositeHookScore
            }
          });

          await prisma.usedTheme.create({
            data: {
              themeName: selectedTheme
            }
          });

          console.log("Memory successfully updated with strategist metadata.");
          return scriptData;
        }

      } catch (err: any) {
        console.error(`Attempt ${attempt} failed:`, err.message);
      }
    }

    console.warn("Strategist failed, using local strategy fallback.");
    return this.getFallbackScript(category);
  }

  private getFallbackScript(category: string): GeneratedScript {
    const handle = process.env.INSTAGRAM_HANDLE || "@ai_signal_09";
    const themes = ["apple_minimal", "bloomberg_dark", "startup_editorial", "cyber_documentary", "luxury_white", "midnight_strategy", "founder_mode", "ai_war_room", "modern_finance", "intelligence_briefing"];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    const layouts = [
      "documentary style", "hidden truth", "shocking statistics", "future prediction",
      "founder breakdown", "AI war analysis", "contrarian opinion", "startup teardown",
      "billionaire psychology", "productivity myth", "emotional storytelling"
    ];
    const layout = layouts[Math.floor(Math.random() * layouts.length)];

    const prefixes = [
      "Breaking: ", "Warning: ", "Nobody noticed: ", "Shocking update: ", "Insiders reveal: ",
      "Look at this: ", "Secret leaked: ", "Stop scrolling: ", "This changes everything: ", "Critical update: "
    ];
    const suffixes = [
      " (uncovered)", " (here's why)", " (must watch)", " (explained)", " (immediately)",
      " (exposed)", " (proven)", " (now live)", " (revealed)", " (secret plan)"
    ];
    const topicModifiers = [
      "The truth about ", "New logic for ", "Analyzing ", "Exploring ", "Redesigning ",
      "Inside the reality of ", "Uncovering the secret of ", "The hidden metrics of ", "Why we must study ", "A new paradigm for ",
      "Deconstructing ", "The exponential growth of ", "A critical look at ", "Rethinking ", "What they missed about "
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const modifier = topicModifiers[Math.floor(Math.random() * topicModifiers.length)];

    let selectedHook = "";
    let selectedTopic: any = null;
    let selectedTopicTitle = "";
    let targetAudience = "developers";
    let slides: SlideContent[] = [];
    let caption = "";

    if (category === "ai") {
      targetAudience = "AI enthusiasts";
      const aiHooks = [
        "NVIDIA employees are secretly terrified",
        "This startup replaced an entire team with one AI agent",
        "Nobody noticed OpenAI's biggest move",
        "This AI trend is about to kill agencies",
        "The hidden cost of running LLMs is exploding",
        "Why top developers are abandoning AI autocomplete",
        "Silicon Valley is hiding this AI loophole",
        "The terrifying reality of agentic workflows",
        "Why custom AI chips will destroy GPUs",
        "OpenAI's project Orion is leaking secret data"
      ];
      const aiTopics = [
        {
          title: "Hardware Moat Cracks",
          body: "Software compiler advances are letting rival chips execute AI code without CUDA.",
          highlight: "The software monopoly is ending.",
          future: "Hardware margins will drop by 40% next year.",
          label: "SILICON WARS"
        },
        {
          title: "Agentic Displacement",
          body: "Autonomous developers are executing end-to-end features without human oversight.",
          highlight: "Entry level software engineering is changing forever.",
          future: "1 developer will command 100 agents by 2028.",
          label: "AGENTIC WORK"
        },
        {
          title: "Model Convergence",
          body: "All major models are reaching similar benchmarks, shifting value to data pipelines.",
          highlight: "Proprietary models are losing their premium pricing.",
          future: "Context windows and custom datasets will dominate.",
          label: "MODEL WARS"
        },
        {
          title: "Open Source Dominance",
          body: "Lightweight, highly optimized open source models are achieving parity with proprietary versions.",
          highlight: "SaaS costs are plummeting to near zero.",
          future: "Local model hosting will become standard practice.",
          label: "OPEN SOURCE"
        },
        {
          title: "Context Window Inflation",
          body: "Large context windows of millions of tokens are completely replacing traditional vector databases.",
          highlight: "In-context learning is beating RAG architectures.",
          future: "Real-time large context analysis is the new gold rush.",
          label: "CONTEXT WARS"
        },
        {
          title: "Custom Silicon Shift",
          body: "Startups are designing custom application-specific integrated circuits to bypass general GPU shortages.",
          highlight: "TPUs and ASICs are scaling exponentially.",
          future: "NVIDIA's supply chain constraint is opening doors for custom silicon.",
          label: "CUSTOM CHIPS"
        },
        {
          title: "Synthetic Data Scaling",
          body: "AI models are training themselves using curated synthetic data to bypass the human internet bottleneck.",
          highlight: "Clean synthetic data avoids copyright constraints.",
          future: "Training quality is now constrained by compute, not internet text.",
          label: "SYNTHETIC DATA"
        },
        {
          title: "Agentic Orchestration",
          body: "Multi-agent frameworks are managing complex enterprise workflows with zero human intervention.",
          highlight: "System architecture is shifting to agent routers.",
          future: "Enterprise operating systems will be completely conversational.",
          label: "AGENTIC SYSTEMS"
        },
        {
          title: "Voice Interface Evolution",
          body: "Ultra-low latency duplex voice models are replacing traditional keyboard/chatbot interfaces.",
          highlight: "Natural voice interactions are reaching <100ms latency.",
          future: "Customer support call centers will be fully autonomous by next quarter.",
          label: "VOICE INTERFACE"
        },
        {
          title: "Local Edge Intelligence",
          body: "Highly dense 8B parameters models are executing complex reasoning locally on standard mobile devices.",
          highlight: "Zero-latency, fully private local intelligence.",
          future: "AI hardware will prioritize local NPU acceleration.",
          label: "EDGE COMPUTING"
        }
      ];

      let hookAttempts = 0;
      do {
        const p = prefixes[Math.floor(Math.random() * prefixes.length)];
        const s = suffixes[Math.floor(Math.random() * suffixes.length)];
        const rh = aiHooks[Math.floor(Math.random() * aiHooks.length)];
        selectedHook = `${p}${rh}${s}`;
        hookAttempts++;
      } while (AIService.usedFallbackHooks.has(selectedHook.toLowerCase()) && hookAttempts < 100);
      AIService.usedFallbackHooks.add(selectedHook.toLowerCase());

      let conceptAttempts = 0;
      do {
        const m = topicModifiers[Math.floor(Math.random() * topicModifiers.length)];
        selectedTopic = aiTopics[Math.floor(Math.random() * aiTopics.length)];
        selectedTopicTitle = `${m}${selectedTopic.title}`;
        conceptAttempts++;
      } while (AIService.usedFallbackConcepts.has(selectedTopicTitle.toLowerCase()) && conceptAttempts < 100);
      AIService.usedFallbackConcepts.add(selectedTopicTitle.toLowerCase());

      slides = [
        { slide_num: 1, type: "hook", label: selectedTopic.label, headline: selectedHook, subheadline: "The shift is happening faster than anyone predicted.", image_prompt: "dark abstract technology gradient" },
        { slide_num: 2, type: "what_happened", title: selectedTopicTitle, body: selectedTopic.body, highlight: selectedTopic.highlight, image_prompt: "soft technology background" },
        { slide_num: 3, type: "key_stats", title: "Key Metrics", stats: ["92% — of developers are adopting agent tools", "4.5x — speed increase in code generation", "0$ — open source cost barrier"], image_prompt: "minimal data grid" },
        { slide_num: 4, type: "why_it_matters", title: "The Impact", body: "Organizations that leverage this setup will out-execute competitors by orders of magnitude.", future: selectedTopic.future, image_prompt: "horizon sunrise graphic" },
        { slide_num: 5, type: "cta", question: "Are you ready to automate?", cta: `Follow ${handle} for daily AI trends`, tagline: "Stay ahead of tech curves", image_prompt: "minimalist glowing shape" }
      ];
      const aiHashtagBanks = [
        "#AI #Technology #DeepLearning #FutureTech",
        "#ArtificialIntelligence #MachineLearning #TechTrends #OpenAI",
        "#GenerativeAI #Startup #TechNews #Innovation",
        "#SiliconValley #AIWar #DeveloperLife #TechUpdates"
      ];
      const selectedHashtags = aiHashtagBanks[Math.floor(Math.random() * aiHashtagBanks.length)];
      caption = `${selectedHook}!\n\n${selectedTopic.body}\n\nWhat are your thoughts? Let us know below!\n\nFollow ${handle} for daily AI news 🚀\n\n${selectedHashtags}`;

    } else if (category === "business") {
      targetAudience = "startup founders";
      const bizHooks = [
        "The dark secret Silicon Valley VCs pray you never uncover",
        "Why smart people are quitting productivity hacks",
        "How a solo founder built a $50M asset with no employees",
        "This micro-business model is silently printing cash",
        "The 'Exit Strategy' Myth: Why most startups fail to sell",
        "Why your savings account is a guaranteed loss",
        "The death of the traditional 9-to-5 agency",
        "How arbitrage models are dominating digital products",
        "Why premium pricing is the only way to survive",
        "The psychological trick VCs use to cut valuations"
      ];
      const bizTopics = [
        {
          title: "Solo Moat Scale",
          body: "Modern infrastructure allows single operators to handle CRM, pipelines, and billing autonomously.",
          highlight: "Solo founders are reaching millions in ARR.",
          future: "The first one-person unicorn is coming.",
          label: "SOLOPRENEUR"
        },
        {
          title: "Agency Rebirth",
          body: "Traditional retainer-based agencies are failing. Value-based delivery models are winning.",
          highlight: "Retainers are dead. Pay-for-performance is key.",
          future: "Consulting will merge with software integration.",
          label: "MARKET SHIFT"
        },
        {
          title: "Pricing Strategy",
          body: "High-ticket positioning reduces support overhead while increasing perceived value.",
          highlight: "Charging premium rates filters out high-friction clients.",
          future: "Middle-tier agency pricing will disappear.",
          label: "VALUATION"
        },
        {
          title: "Arbitrage Micro SaaS",
          body: "Building highly targeted micro-solutions that wrap API services for specific niche markets.",
          highlight: "Niche wraps scale rapidly with low engineering overhead.",
          future: "Micro SaaS acquisitions will dominate startup exits.",
          label: "MICRO SAAS"
        },
        {
          title: "Programmatic SEO",
          body: "Generating hundreds of hyper-focused landing pages automatically to capture long-tail traffic.",
          highlight: "Passive organic lead generation scaling.",
          future: "AI-driven search engines will deprioritize generic landing sites.",
          label: "SEO GROWTH"
        },
        {
          title: "Cold Email Automation",
          body: "Employing custom trained LLMs to write hyper-personalized cold outreach copy at scale.",
          highlight: "High deliverability, personalized communication.",
          future: "Traditional blanket cold outreach is officially dead.",
          label: "OUTBOUND SALES"
        },
        {
          title: "Community Led Growth",
          body: "Building curated private groups around shared values instead of relying on standard paid ads.",
          highlight: "Customer retention increases by 300%.",
          future: "Skool and Discord are the new marketing funnel standard.",
          label: "COMMUNITY"
        },
        {
          title: "Productized Services",
          body: "Structuring agency consultancies into flat, fixed-price monthly recurring packages.",
          highlight: "Eliminates scope creep and pricing negotiation.",
          future: "Hourly agency billing is rapidly collapsing.",
          label: "SERVICE PRODUCT"
        },
        {
          title: "Newsletter Sponsorships",
          body: "Monetizing deep, highly engaged micro-audiences using sponsored content sections.",
          highlight: "Premium sponsorship CPMs are beating social media ad revenue.",
          future: "Curated niche media will continue to dominate.",
          label: "NICHE MEDIA"
        },
        {
          title: "Micro Acquisitions",
          body: "Acquiring profitable, under-marketed SaaS products and optimizing them using SEO.",
          highlight: "Saves years of product validation time.",
          future: "Aggregator firms will scale micro acquisitions aggressively.",
          label: "ACQUISITIONS"
        }
      ];

      let hookAttempts = 0;
      do {
        const p = prefixes[Math.floor(Math.random() * prefixes.length)];
        const s = suffixes[Math.floor(Math.random() * suffixes.length)];
        const rh = bizHooks[Math.floor(Math.random() * bizHooks.length)];
        selectedHook = `${p}${rh}${s}`;
        hookAttempts++;
      } while (AIService.usedFallbackHooks.has(selectedHook.toLowerCase()) && hookAttempts < 100);
      AIService.usedFallbackHooks.add(selectedHook.toLowerCase());

      let conceptAttempts = 0;
      do {
        const m = topicModifiers[Math.floor(Math.random() * topicModifiers.length)];
        selectedTopic = bizTopics[Math.floor(Math.random() * bizTopics.length)];
        selectedTopicTitle = `${m}${selectedTopic.title}`;
        conceptAttempts++;
      } while (AIService.usedFallbackConcepts.has(selectedTopicTitle.toLowerCase()) && conceptAttempts < 100);
      AIService.usedFallbackConcepts.add(selectedTopicTitle.toLowerCase());

      slides = [
        { slide_num: 1, type: "hook", label: selectedTopic.label, headline: selectedHook, subheadline: "Most people are playing the wrong business game.", image_prompt: "minimalist workspace shadow" },
        { slide_num: 2, type: "what_happened", title: selectedTopicTitle, body: selectedTopic.body, highlight: selectedTopic.highlight, image_prompt: "warm soft light workspace" },
        { slide_num: 3, type: "key_stats", title: "Scale Stats", stats: ["85% — margin on automated digital assets", "3x — higher conversion on premium tiers", "10x — reduction in customer friction"], image_prompt: "clean layout statistics" },
        { slide_num: 4, type: "why_it_matters", title: "Why It Works", body: "Positioning yourself at the premium end allows you to spend more on acquisition and build a better product.", future: selectedTopic.future, image_prompt: "clean sunrise path" },
        { slide_num: 5, type: "cta", question: "Would you build a solo business?", cta: `Follow ${handle} for daily drive`, tagline: "Build simple, scale big", image_prompt: "minimalist glowing shape" }
      ];
      const bizHashtagBanks = [
        "#business #sidehustle #entrepreneur #founder",
        "#startup #venturecapital #SaaS #GrowthHack",
        "#solopreneur #businessstrategy #marketingtips #agency",
        "#makemoneyonline #wealthbuilding #startupfounder #B2B"
      ];
      const selectedHashtags = bizHashtagBanks[Math.floor(Math.random() * bizHashtagBanks.length)];
      caption = `${selectedHook}!\n\n${selectedTopic.body}\n\nWhat are your thoughts? Let us know below!\n\nFollow ${handle} for daily business insights 💸\n\n${selectedHashtags}`;

    } else {
      targetAudience = "productivity audience";
      const motHooks = [
        "Discipline beats talent every single day",
        "Why consistency always defeats high intensity",
        "The psychological cost of seeking comfortable choices",
        "How average builders become peak performers",
        "The ultimate comeback formula for late starters",
        "Why you must ignore the opinions of onlookers",
        "The power of silent, focused work in dark rooms",
        "How comfortable routines are secretly killing ambition",
        "Why standard motivation is a trap for amateurs",
        "The mental shifts that define billionaire execution"
      ];
      const motTopics = [
        {
          title: "The 1% Rule",
          body: "Showing up when you are tired, bored, or unmotivated compounds into massive advantage.",
          highlight: "Consistency always defeats short bursts of intensity.",
          future: "Your daily systems dictate your outcome.",
          label: "MINDSET"
        },
        {
          title: "Silent Execution",
          body: "Announcing goals triggers dopamine release before work starts, decreasing follow-through.",
          highlight: "Stop talking. Start executing in silence.",
          future: "Let your results make the noise.",
          label: "DISCIPLINE"
        },
        {
          title: "Character Moat",
          body: "Choosing the harder path builds tolerance to friction, making you resilient in down markets.",
          highlight: "Friction is a competitive advantage.",
          future: "Character is built when nobody is watching.",
          label: "GROWTH"
        },
        {
          title: "Dopamine Detoxing",
          body: "Eliminating digital scrolling to reset receptors and regain long-term focus capabilities.",
          highlight: "Resetting base baseline focus levels.",
          future: "Concentration is the ultimate premium currency.",
          label: "MENTAL RESET"
        },
        {
          title: "Monastic Focus",
          body: "Restricting input to zero during 4-hour deep work sprints with absolutely no distractions.",
          highlight: "4 hours of deep focus beats 12 hours of shallow work.",
          future: "Undisturbed focus will differentiate peak performers.",
          label: "DEEP WORK"
        },
        {
          title: "Imposter Syndrome Moat",
          body: "Treating feeling unqualified as proof that you are actively stepping into your growth zone.",
          highlight: "Discomfort indicates active learning.",
          future: "Fear is standard. Execution is compulsory.",
          label: "SELF-DOUBT"
        },
        {
          title: "High Friction Habits",
          body: "Executing your most challenging work tasks first thing in the morning when mental energy peaks.",
          highlight: "Eat the frog before checking notifications.",
          future: "Procrastination shrinks under morning momentum.",
          label: "MIND HABITS"
        },
        {
          title: "Feedback Loop Velocity",
          body: "Prioritizing speed of launch and rapid iteration cycles over pursuing elusive perfect states.",
          highlight: "Ship, fail, learn, repeat immediately.",
          future: "Flawless planning is the ultimate developer cope.",
          label: "EXECUTION"
        },
        {
          title: "System Over Goals",
          body: "Focusing strictly on daily execution systems instead of fantasizing about long-term goals.",
          highlight: "You fall to the level of your systems.",
          future: "Systems guarantee results; goals trigger anxiety.",
          label: "HABIT FLOW"
        },
        {
          title: "Leverage Optimization",
          body: "Relentlessly delegating or automating repetitive task pipelines to maximize high-leverage outputs.",
          highlight: "Work on the business, not in the business.",
          future: "Automation is the ultimate leverage multiplier.",
          label: "LEVERAGE"
        }
      ];

      let hookAttempts = 0;
      do {
        const p = prefixes[Math.floor(Math.random() * prefixes.length)];
        const s = suffixes[Math.floor(Math.random() * suffixes.length)];
        const rh = motHooks[Math.floor(Math.random() * motHooks.length)];
        selectedHook = `${p}${rh}${s}`;
        hookAttempts++;
      } while (AIService.usedFallbackHooks.has(selectedHook.toLowerCase()) && hookAttempts < 100);
      AIService.usedFallbackHooks.add(selectedHook.toLowerCase());

      let conceptAttempts = 0;
      do {
        const m = topicModifiers[Math.floor(Math.random() * topicModifiers.length)];
        selectedTopic = motTopics[Math.floor(Math.random() * motTopics.length)];
        selectedTopicTitle = `${m}${selectedTopic.title}`;
        conceptAttempts++;
      } while (AIService.usedFallbackConcepts.has(selectedTopicTitle.toLowerCase()) && conceptAttempts < 100);
      AIService.usedFallbackConcepts.add(selectedTopicTitle.toLowerCase());

      slides = [
        { slide_num: 1, type: "hook", label: selectedTopic.label, headline: selectedHook, subheadline: "Friction is where growth happens.", image_prompt: "dramatic runner silhouette" },
        { slide_num: 2, type: "what_happened", title: selectedTopicTitle, body: selectedTopic.body, highlight: selectedTopic.highlight, image_prompt: "dramatic light beam" },
        { slide_num: 3, type: "key_stats", title: "Daily Habits", stats: ["37x — compounding gain of 1% daily changes", "90% — of execution happens in the boring zone", "1 — focus metric matters"], image_prompt: "minimalist stairs climb" },
        { slide_num: 4, type: "why_it_matters", title: "The Character Moat", body: "When you automate your discipline, you remove emotion from work, executing regardless of mood or setbacks.", future: selectedTopic.future, image_prompt: "mountain peak morning" },
        { slide_num: 5, type: "cta", question: "Will you show up tomorrow?", cta: `Follow ${handle} for daily motivation`, tagline: "Build your character", image_prompt: "minimalist glowing shape" }
      ];
      const motHashtagBanks = [
        "#motivation #mindset #discipline #consistency",
        "#grind #hustle #successquotes #dailyhabits",
        "#stoicism #mentaltoughness #focus #personaldevelopment",
        "#growthmindset #selfimprovement #winner #execution"
      ];
      const selectedHashtags = motHashtagBanks[Math.floor(Math.random() * motHashtagBanks.length)];
      caption = `${selectedHook}!\n\n${selectedTopic.body}\n\nWhat are your thoughts? Let us know below!\n\nFollow ${handle} for daily mindset & drive 🧠\n\n${selectedHashtags}`;
    }

    return {
      theme,
      style_type: layout,
      slides,
      caption,
      metadata: {
        viral_probability: 75 + Math.floor(Math.random() * 20),
        target_audience: targetAudience,
        emotional_trigger_profile: {
          curiosity: 80,
          fear: 40,
          aspiration: 70,
          controversy: 30,
          surprise: 60,
          social_proof: 50,
          authority: 65,
          urgency: 45
        },
        hook_retention_prediction: {
          scroll_stop: 85,
          retention: 80,
          comment: 70,
          save: 75,
          share: 65
        },
        shareability_prediction: 78,
        save_probability: 72,
        trend_momentum_score: 82,
        confidence_score: 85
      }
    };
  }
}
