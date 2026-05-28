"""
Content generator: uses Gemini to create slide-by-slide content
for each carousel post.
"""
import json
import re
from google import genai
from google.genai import types as genai_types

from src.utils import get_logger, get_today_str

logger = get_logger("content_generator")


SLIDE_TEMPLATES = {
    "hook": {
        "type": "hook",
        "description": "Bold hook — stop-the-scroll opener",
    },
    "what_happened": {
        "type": "what_happened",
        "description": "Clear explanation of the news",
    },
    "key_stats": {
        "type": "key_stats",
        "description": "Numbers, data, impressive facts",
    },
    "why_it_matters": {
        "type": "why_it_matters",
        "description": "Real-world impact and future implications",
    },
    "cta": {
        "type": "cta",
        "description": "Call to action + engagement question",
    },
}


class ContentGenerator:
    def __init__(self, gemini_api_key: str, instagram_handle: str = "@ainewsdaily"):
        self._client = genai.Client(api_key=gemini_api_key)
        self.handle = instagram_handle

    def generate_carousel_content(self, story: dict, aggressive_hooks: bool = False) -> dict:
        """
        Generate all slide content + caption for a story.
        Returns a dict with 'slides' (list of slide dicts) and 'caption'.
        """
        logger.info(f"Generating carousel for: {story.get('headline', 'Unknown')}")

        hook_instruction = "CRITICAL: The current account views are below target. Write an EXTREMELY AGGRESSIVE, scroll-stopping, psychological curiosity hook for Slide 1 that practically FORCES people to swipe. Make it high-impact and click-worthy." if aggressive_hooks else ""

        prompt = f"""You are a viral Instagram content creator specializing in AI news. Your posts get 50K+ likes because they are:
- Clear and easy to understand (no jargon)
- Visually structured for mobile screens
- Use curiosity hooks that make people swipe
- Data-driven with impressive facts
- Written like a smart friend explaining news, not a robot

{hook_instruction}

Create a 5-slide Instagram carousel for this AI news story:

HEADLINE: {story.get('headline', '')}
HOOK: {story.get('hook', '')}
BULLETS: {json.dumps(story.get('bullets', []))}
KEY STAT: {story.get('key_stat', 'Not available')}
WHY IT MATTERS: {story.get('why_it_matters', '')}
SOURCE: {story.get('source', '')}

TODAY'S DATE: {get_today_str()}
INSTAGRAM HANDLE: {self.handle}

Create exactly 5 slides with this structure:

SLIDE 1 — HOOK (the scroll-stopper)
- LABEL: Short category label (e.g. "BREAKING", "AI UPDATE", "MUST KNOW")
- HEADLINE: 4-8 word punchy headline (ALL CAPS or Title Case)  
- SUBHEADLINE: 1 curiosity-driving sentence (max 12 words)
- EMOJI: 1-2 relevant emojis

SLIDE 2 — WHAT HAPPENED
- TITLE: "What Happened" or similar
- BODY: 2-3 short paragraphs explaining the story clearly
- HIGHLIGHT: The single most surprising sentence (will be styled differently)

SLIDE 3 — KEY STATS & FACTS
- TITLE: "By The Numbers" or "Key Facts"
- STATS: List of 3-4 impressive stats/facts (format: "NUMBER — explanation")
- Each stat should be on its own line

SLIDE 4 — WHY IT MATTERS
- TITLE: "Why This Matters" or "The Big Picture"
- BODY: 2 short paragraphs on real-world impact
- FUTURE: 1 sentence about what this means for the future

SLIDE 5 — CTA (call to action)
- QUESTION: An engaging question to drive comments (e.g. "Do you think AI will replace your job?")
- CTA: "Follow {self.handle} for daily AI updates"
- TAGLINE: Short punchy brand message

Also generate:
CAPTION: Full Instagram caption (max 2000 chars) with:
- Opening hook (first 125 chars must be gripping — it's the preview)
- Story summary (2-3 sentences)
- 3-5 key takeaways with emojis
- Source credit: "Source: {story.get('source', 'Multiple sources')}"
- Engagement question
- 25-30 hashtags (mix of popular + niche AI hashtags)

Return as valid JSON with this EXACT structure:
{{
  "slides": [
    {{
      "slide_num": 1,
      "type": "hook",
      "label": "BREAKING",
      "headline": "...",
      "subheadline": "...",
      "emoji": "🤖",
      "image_prompt": "photorealistic minimalist image concept for this slide background, light warm tones, no text"
    }},
    {{
      "slide_num": 2,
      "type": "what_happened",
      "title": "What Happened",
      "body": "paragraph 1\\n\\nparagraph 2",
      "highlight": "most surprising sentence",
      "image_prompt": "..."
    }},
    {{
      "slide_num": 3,
      "type": "key_stats",
      "title": "By The Numbers",
      "stats": ["$1.2B — investment raised", "10x — faster than competitors", "500M — users impacted"],
      "image_prompt": "..."
    }},
    {{
      "slide_num": 4,
      "type": "why_it_matters",
      "title": "Why This Matters",
      "body": "paragraph 1\\n\\nparagraph 2",
      "future": "future implication sentence",
      "image_prompt": "..."
    }},
    {{
      "slide_num": 5,
      "type": "cta",
      "question": "engaging question?",
      "cta": "Follow {self.handle} for daily AI updates 🔔",
      "tagline": "Stay ahead of the AI curve",
      "image_prompt": "..."
    }}
  ],
  "caption": "full instagram caption with hashtags..."
}}

Return ONLY valid JSON."""

        import time
        MODELS_TO_TRY = [
            "gemini-2.0-flash",
            "gemini-2.5-flash-lite",
            "gemini-flash-latest",
            "gemini-2.0-flash-lite",
        ]

        for model_name in MODELS_TO_TRY:
            for attempt in range(2):
                try:
                    response = self._client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=genai_types.GenerateContentConfig(
                            temperature=0.8,
                            max_output_tokens=3000,
                        ),
                    )
                    text = response.text.strip()
                    if "```" in text:
                        text = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
                    content = json.loads(text)
                    logger.info(f"Generated {len(content.get('slides', []))} slides via {model_name}")
                    return content
                except Exception as e:
                    err_str = str(e)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                        wait = 10 * (2 ** attempt)
                        logger.warning(f"{model_name} rate limited, waiting {wait}s...")
                        time.sleep(wait)
                    elif "404" in err_str or "NOT_FOUND" in err_str:
                        logger.warning(f"Model {model_name} not available, trying next...")
                        break
                    else:
                        logger.error(f"Content gen {model_name} failed: {e}")
                        break
            else:
                logger.warning(f"Model {model_name} exhausted, trying next model...")
                continue

        logger.warning("All Gemini models exhausted for content gen. Using fallback.")
        return self._fallback_content(story)


    def _fallback_content(self, story: dict) -> dict:
        """Minimal fallback if Gemini fails."""
        headline = story.get("headline", "AI Update")
        bullets = story.get("bullets", ["Major development in AI", "Industry impact expected", "Follow for more"])
        stats = story.get("key_stat", "Major milestone reached")

        return {
            "slides": [
                {
                    "slide_num": 1, "type": "hook",
                    "label": "AI UPDATE",
                    "headline": headline[:50],
                    "subheadline": story.get("hook", "You need to know about this")[:80],
                    "emoji": "🤖",
                    "image_prompt": "clean minimal abstract tech background warm beige tones",
                },
                {
                    "slide_num": 2, "type": "what_happened",
                    "title": "What Happened",
                    "body": "\n\n".join(bullets),
                    "highlight": bullets[0] if bullets else "Major AI development",
                    "image_prompt": "soft abstract light background minimal warm tones",
                },
                {
                    "slide_num": 3, "type": "key_stats",
                    "title": "Key Facts",
                    "stats": [stats] if stats else ["Significant industry milestone"],
                    "image_prompt": "minimal clean chart abstract background warm cream tones",
                },
                {
                    "slide_num": 4, "type": "why_it_matters",
                    "title": "Why This Matters",
                    "body": story.get("why_it_matters", "This represents a significant step in AI development."),
                    "future": "The implications for the future are profound.",
                    "image_prompt": "expansive horizon minimal abstract warm light background",
                },
                {
                    "slide_num": 5, "type": "cta",
                    "question": "What do you think about this AI development?",
                    "cta": f"Follow {self.handle} for daily AI updates 🔔",
                    "tagline": "Stay ahead of the AI curve",
                    "image_prompt": "clean minimal warm gradient abstract background",
                },
            ],
            "caption": (
                f"🤖 {headline}\n\n"
                f"{story.get('hook', '')}\n\n"
                f"Key points:\n" + "\n".join([f"• {b}" for b in bullets]) + "\n\n"
                f"Source: {story.get('source', 'Multiple sources')}\n\n"
                "#AI #ArtificialIntelligence #Tech #MachineLearning #AINews "
                "#DeepLearning #ChatGPT #OpenAI #FutureTech #Innovation"
            ),
        }

    def generate_business_content(self, aggressive_hooks: bool = False) -> dict:
        """
        Generate a 5-slide flow on Business and Money Earnings.
        """
        logger.info("Generating Business & Money content...")

        hook_instruction = "CRITICAL: The current account views are below target. Write an EXTREMELY AGGRESSIVE, scroll-stopping, psychological curiosity hook for Slide 1 that practically FORCES people to watch. (e.g., 'THE SECRET SIDE HUSTLE THEY ARE TRYING TO HIDE' or '3 AI TOOLS TO MAKE MONEY WHILE YOU SLEEP')" if aggressive_hooks else ""

        prompt = f"""You are a viral Instagram business & finance content creator. Your posts get 100K+ views because they cover actionable side hustles, smart startup ideas, online income methods, AI tools for productivity, and billionaire habits.
        
        {hook_instruction}

        Create a highly engaging 5-slide business reel content flow. Focus on ONE of the following topics (choose one dynamically to keep content fresh):
        - Actionable side hustles/online income methods for students or creators.
        - Innovative startup ideas enabled by AI or modern tech.
        - 3 game-changing AI business tools.
        - Mindsets or habits of self-made billionaires.
        
        INSTAGRAM HANDLE: {self.handle}
        
        Create exactly 5 slides with this structure:
        
        SLIDE 1 — HOOK (the scroll-stopper)
        - LABEL: Short category label (e.g. "MONEY HUSTLE", "STARTUP IDEA", "FINANCE HACKS")
        - HEADLINE: 4-8 word punchy headline in ALL CAPS or Title Case (e.g., "GET PAID TO USE THESE 3 AI TOOLS" or "THE $10K/MONTH STUDENT SIDE HUSTLE")
        - SUBHEADLINE: 1 curiosity-driving sentence (max 12 words)
        - EMOJI: 1-2 relevant emojis
        
        SLIDE 2 — WHAT IT IS / HOW IT WORKS
        - TITLE: "How It Works" or "The Opportunity"
        - BODY: 2-3 short, clear sentences or paragraphs explaining the concept/hustle
        - HIGHLIGHT: The single most surprising/important instruction or fact (styled differently)
        
        SLIDE 3 — STEP-BY-STEP OR STATS
        - TITLE: "Steps To Start" or "By The Numbers"
        - STATS: List of 3-4 steps/facts (format: "STEP 1 — Actionable step" or "NUMBER — Financial stat")
        
        SLIDE 4 — WHY IT WORKS / PRO TIPS
        - TITLE: "Why It Works" or "Pro Tips"
        - BODY: 2 short paragraphs on the market demand or hidden secrets to succeed
        - FUTURE: 1 sentence about the earning potential or scale
        
        SLIDE 5 — CTA (call to action)
        - QUESTION: An engaging business question to drive comments (e.g., "Would you try this side hustle?")
        - CTA: "Follow {self.handle} for daily money & startup tips 📈"
        - TAGLINE: Short punchy brand message
        
        Also generate:
        CAPTION: Full Instagram caption (max 2000 chars) with:
        - Opening hook
        - Clear breakdown of the idea/steps
        - Emojis for readability
        - Call to action to follow
        - 25-30 hashtags (mix of business, startup, sidehustle, wealth creation)
        
        Return as valid JSON with this EXACT structure:
        {{
          "slides": [
            {{
              "slide_num": 1,
              "type": "hook",
              "label": "MONEY HUSTLE",
              "headline": "...",
              "subheadline": "...",
              "emoji": "💸",
              "image_prompt": "photorealistic minimalist clean aesthetic for this slide background, warm cream tones, no text"
            }},
            {{
              "slide_num": 2,
              "type": "what_happened",
              "title": "...",
              "body": "...",
              "highlight": "...",
              "image_prompt": "..."
            }},
            {{
              "slide_num": 3,
              "type": "key_stats",
              "title": "...",
              "stats": ["...", "...", "..."],
              "image_prompt": "..."
            }},
            {{
              "slide_num": 4,
              "type": "why_it_matters",
              "title": "...",
              "body": "...",
              "future": "...",
              "image_prompt": "..."
            }},
            {{
              "slide_num": 5,
              "type": "cta",
              "question": "...",
              "cta": "...",
              "tagline": "...",
              "image_prompt": "..."
            }}
          ],
          "caption": "full instagram caption with hashtags..."
        }}
        
        Return ONLY valid JSON."""

        import time
        MODELS_TO_TRY = ["gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]

        for model_name in MODELS_TO_TRY:
            for attempt in range(2):
                try:
                    response = self._client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=genai_types.GenerateContentConfig(
                            temperature=0.85,
                            max_output_tokens=3000,
                        ),
                    )
                    text = response.text.strip()
                    if "```" in text:
                        text = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
                    content = json.loads(text)
                    logger.info(f"Generated Business content via {model_name}")
                    return content
                except Exception as e:
                    err_str = str(e)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        time.sleep(10 * (2 ** attempt))
                    else:
                        break
            else:
                continue

        logger.warning("Gemini models failed for business content. Using fallback.")
        return self._fallback_business_content()

    def _fallback_business_content(self) -> dict:
        return {
            "slides": [
                {
                    "slide_num": 1, "type": "hook",
                    "label": "MONEY HUSTLE",
                    "headline": "3 AI TOOLS TO MAKE $100/DAY",
                    "subheadline": "Easiest ways to make passive income this week.",
                    "emoji": "💸",
                    "image_prompt": "clean minimalist business workspace warm cream tones",
                },
                {
                    "slide_num": 2, "type": "what_happened",
                    "title": "The Opportunity",
                    "body": "AI tools have democratized content creation. You can now build, write, and design assets in seconds for clients who pay premium rates.",
                    "highlight": "No prior coding or design skills required.",
                    "image_prompt": "soft warm cream abstract laptop aesthetic",
                },
                {
                    "slide_num": 3, "type": "key_stats",
                    "title": "Top 3 AI Tools",
                    "stats": ["Tool 1 — ChatGPT for copywriting & scripts", "Tool 2 — Canva/Midjourney for graphics", "Tool 3 — ElevenLabs for voiceovers"],
                    "image_prompt": "minimal tech diagram warm tones",
                },
                {
                    "slide_num": 4, "type": "why_it_matters",
                    "title": "Why This Works",
                    "body": "Businesses are looking to outsource work to speed up their processes. By using AI, you can deliver high-quality work 10x faster than traditional freelancers.",
                    "future": "Earning potential can scale to $3K-$5K/month.",
                    "image_prompt": "growing bar chart abstract warm colors",
                },
                {
                    "slide_num": 5, "type": "cta",
                    "question": "Which tool are you trying first?",
                    "cta": f"Follow {self.handle} for daily money ideas 📈",
                    "tagline": "Build your financial freedom",
                    "image_prompt": "warm abstract background minimal design",
                },
            ],
            "caption": (
                "💸 3 AI tools to make $100/day!\n\n"
                "If you want to start earning online, here are 3 tools to leverage today:\n"
                "1️⃣ ChatGPT: Generate copy, blogs, and video scripts for clients.\n"
                "2️⃣ Canva / Midjourney: Design logos, social media posts, and banners.\n"
                "3️⃣ ElevenLabs: Create realistic voiceovers for marketing videos.\n\n"
                "Which one are you starting with? Let us know below!\n\n"
                f"Follow {self.handle} for daily business ideas & side hustles 📈\n\n"
                "#sidehustle #onlinebusiness #sidehustleideas #entrepreneur #moneyhacks #financialfreedom #passiveincome #makemoneyonline"
            ),
        }

    def generate_motivation_content(self, aggressive_hooks: bool = False) -> dict:
        """
        Generate a 5-slide flow on Motivation / Stories.
        """
        logger.info("Generating Motivation content...")

        hook_instruction = "CRITICAL: The current account views are below target. Write an EXTREMELY AGGRESSIVE, scroll-stopping, psychological curiosity hook for Slide 1 that practically FORCES people to watch. (e.g., 'YOU ARE WASTING YOUR 20s (READ THIS)' or 'THE BRUTAL TRUTH ABOUT SUCCESS NO ONE TELLS YOU')" if aggressive_hooks else ""

        prompt = f"""You are a viral Instagram motivational storyteller. Your posts get high retention and endless loops because they share short emotional stories, lessons on discipline, billionaire mindsets, or historical/real-life success incidents.
        
        {hook_instruction}

        Create a highly emotional and gripping 5-slide motivational reel content flow. Focus on ONE of the following:
        - A short story about someone getting rejected, failing, or betrayed but persisting to build a massive success (e.g. billionaire story, historical figure).
        - A punchy call-to-action on discipline vs talent, wasting your 20s, or the power of 1% improvement.
        - Dark psychology/mindset hacks used by ultra-successful people.
        
        INSTAGRAM HANDLE: {self.handle}
        
        Create exactly 5 slides with this structure:
        
        SLIDE 1 — HOOK (the scroll-stopper)
        - LABEL: Short category label (e.g. "MINDSET", "PERSISTENCE", "UNSTOPPABLE")
        - HEADLINE: 4-8 word punchy headline in ALL CAPS or Title Case (e.g., "HE WAS REJECTED 47 TIMES", "YOU ARE WASTING YOUR 20S")
        - SUBHEADLINE: 1 curiosity-driving sentence (max 12 words)
        - EMOJI: 1-2 relevant emojis
        
        SLIDE 2 — THE INCIDENT / CHALLENGE
        - TITLE: "The Setup" or "The Struggle"
        - BODY: 2-3 short paragraphs showing the emotional struggle, betrayal, or initial failure. Make the reader feel the pain/intensity.
        - HIGHLIGHT: The single most impactful sentence (styled differently)
        
        SLIDE 3 — THE TURNING POINT
        - TITLE: "The Turning Point" or "The Shift"
        - STATS: List of 3-4 milestones, rules, or mindset shifts (format: "RULE 1 — explanation" or "YEAR — what changed")
        
        SLIDE 4 — THE CLIMAX / LESSON
        - TITLE: "The Climax" or "The Lesson"
        - BODY: 2 short paragraphs on the success achieved and the ultimate truth learned
        - FUTURE: 1 powerful takeaway quote or future perspective
        
        SLIDE 5 — CTA (call to action)
        - QUESTION: An engaging question to drive comments (e.g. "Do you agree with this mindset?")
        - CTA: "Follow {self.handle} for daily growth & drive 🧠"
        - TAGLINE: Short punchy brand message
        
        Also generate:
        CAPTION: Full Instagram caption (max 2000 chars) with:
        - Opening hook
        - Detailed narrative summary
        - Powerful motivational bullets
        - Call to action to follow
        - 25-30 hashtags (mix of motivation, mindset, discipline, grit, success)
        
        Return as valid JSON with this EXACT structure:
        {{
          "slides": [
            {{
              "slide_num": 1,
              "type": "hook",
              "label": "MINDSET",
              "headline": "...",
              "subheadline": "...",
              "emoji": "🔥",
              "image_prompt": "dramatic photorealistic minimalist aesthetic for this slide background, warm dark tones, high contrast, no text"
            }},
            {{
              "slide_num": 2,
              "type": "what_happened",
              "title": "...",
              "body": "...",
              "highlight": "...",
              "image_prompt": "..."
            }},
            {{
              "slide_num": 3,
              "type": "key_stats",
              "title": "...",
              "stats": ["...", "...", "..."],
              "image_prompt": "..."
            }},
            {{
              "slide_num": 4,
              "type": "why_it_matters",
              "title": "...",
              "body": "...",
              "future": "...",
              "image_prompt": "..."
            }},
            {{
              "slide_num": 5,
              "type": "cta",
              "question": "...",
              "cta": "...",
              "tagline": "...",
              "image_prompt": "..."
            }}
          ],
          "caption": "full instagram caption with hashtags..."
        }}
        
        Return ONLY valid JSON."""

        import time
        MODELS_TO_TRY = ["gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-flash-latest"]

        for model_name in MODELS_TO_TRY:
            for attempt in range(2):
                try:
                    response = self._client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=genai_types.GenerateContentConfig(
                            temperature=0.85,
                            max_output_tokens=3000,
                        ),
                    )
                    text = response.text.strip()
                    if "```" in text:
                        text = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
                    content = json.loads(text)
                    logger.info(f"Generated Motivation content via {model_name}")
                    return content
                except Exception as e:
                    err_str = str(e)
                    if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                        time.sleep(10 * (2 ** attempt))
                    else:
                        break
            else:
                continue

        logger.warning("Gemini models failed for motivation content. Using fallback.")
        return self._fallback_motivation_content()

    def _fallback_motivation_content(self) -> dict:
        return {
            "slides": [
                {
                    "slide_num": 1, "type": "hook",
                    "label": "MINDSET",
                    "headline": "DISCIPLINE BEATS TALENT EVERY TIME",
                    "subheadline": "Why talent is useless without execution.",
                    "emoji": "🔥",
                    "image_prompt": "dramatic high contrast silhouette running minimal warm tones",
                },
                {
                    "slide_num": 2, "type": "what_happened",
                    "title": "The Hard Truth",
                    "body": "Talented people fail every day because they rely on ease instead of effort. When you rest on talent, you stop growing. Those who show up daily will eventually surpass you.",
                    "highlight": "Consistency always defeats intensity.",
                    "image_prompt": "dramatic light beam minimal dark background",
                },
                {
                    "slide_num": 3, "type": "key_stats",
                    "title": "The 1% Rule",
                    "stats": ["Rule 1 — Show up even when you don't feel like it", "Rule 2 — 1% improvement daily is 37x better in a year", "Rule 3 — Focus on the work, ignore the noise"],
                    "image_prompt": "minimal growth steps dark background",
                },
                {
                    "slide_num": 4, "type": "why_it_matters",
                    "title": "The Ultimate Payoff",
                    "body": "By building systems of discipline, you take emotion out of the equation. You execute regardless of mood, energy, or circumstances. That is the billionaire mindset.",
                    "future": "Success is a slow burn, not an overnight spark.",
                    "image_prompt": "distant mountain peak minimal dramatic lighting",
                },
                {
                    "slide_num": 5, "type": "cta",
                    "question": "Are you showing up today?",
                    "cta": f"Follow {self.handle} for daily drive & mindset 🧠",
                    "tagline": "Unleash your potential",
                    "image_prompt": "high contrast warm gradient background",
                },
            ],
            "caption": (
                "🔥 Discipline beats talent every single time!\n\n"
                "Relying on talent alone is a trap. Here is how to build unstoppable discipline:\n"
                "1️⃣ Consistency: 1% daily improvement leads to 37x growth over a year.\n"
                "2️⃣ Systems: Build systems to work automatically, regardless of how you feel.\n"
                "3️⃣ Focus: Block out the noise and prioritize raw execution.\n\n"
                "Are you showing up today? Share your thoughts below!\n\n"
                f"Follow {self.handle} for daily drive & mindset 🧠\n\n"
                "#motivation #mindset #discipline #grit #successmindset #billionairehabits #consistency #unstoppable"
            ),
        }
