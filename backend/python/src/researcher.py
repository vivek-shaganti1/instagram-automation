"""
News researcher: fetches top AI stories from multiple sources
and uses Grok to rank + summarize the best 5.
"""
import json
import time
import re
import requests
import feedparser
from datetime import datetime, timedelta, timezone
from typing import Optional

from src.utils import get_logger

logger = get_logger("researcher")

# ─── RSS Feeds (copyright-safe headlines + summaries) ────────────────────────
RSS_FEEDS = [
    ("TechCrunch AI", "https://techcrunch.com/category/artificial-intelligence/feed/"),
    ("The Verge AI", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"),
    ("Ars Technica AI", "https://feeds.arstechnica.com/arstechnica/technology-lab"),
    ("MIT Tech Review", "https://www.technologyreview.com/feed/"),
    ("VentureBeat AI", "https://venturebeat.com/ai/feed/"),
    ("Wired AI", "https://www.wired.com/feed/tag/artificial-intelligence/rss"),
    ("Google News RSS", "https://news.google.com/rss/search?q=artificial+intelligence+AI&hl=en-US&gl=US&ceid=US:en"),
    ("Google News LLM", "https://news.google.com/rss/search?q=LLM+language+model+2025&hl=en-US&gl=US&ceid=US:en"),
    ("Google News OpenAI", "https://news.google.com/rss/search?q=OpenAI+Anthropic+Google+DeepMind&hl=en-US&gl=US&ceid=US:en"),
]

# ─── Hacker News (top stories via API) ─────────────────────────
HN_API = "https://hn.algolia.com/api/v1/search"

# ─── Reddit ──────────────────────────────
REDDIT_SUBS = [
    "artificial",
    "MachineLearning",
    "singularity",
    "ChatGPT",
    "OpenAI",
    "LocalLLaMA",
]


class NewsResearcher:
    def __init__(self, gemini_api_key: str, lookback_hours: int = 24):
        self.lookback_hours = lookback_hours
        self.api_key = gemini_api_key
        self.cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    # ─── Fetchers ─────────────────────────────────────────────────────────────

    def _fetch_rss(self) -> list[dict]:
        items = []
        for source_name, url in RSS_FEEDS:
            try:
                feed = feedparser.parse(url)
                for entry in feed.entries[:15]:
                    pub = self._parse_date(entry)
                    if pub and pub < self.cutoff:
                        continue
                    items.append({
                        "source": source_name,
                        "title": entry.get("title", "").strip(),
                        "summary": self._strip_html(entry.get("summary", entry.get("description", ""))),
                        "url": entry.get("link", ""),
                        "published": pub.isoformat() if pub else "",
                    })
                logger.info(f"RSS {source_name}: {len(feed.entries)} entries fetched")
            except Exception as e:
                logger.warning(f"RSS feed {source_name} failed: {e}")
            time.sleep(0.3)
        return items

    def _fetch_hacker_news(self) -> list[dict]:
        items = []
        try:
            params = {
                "query": "AI artificial intelligence LLM machine learning",
                "tags": "story",
                "numericFilters": f"created_at_i>{int(self.cutoff.timestamp())}",
                "hitsPerPage": 30,
                "restrictSearchableAttributes": "title",
            }
            r = requests.get(HN_API, params=params, timeout=10)
            r.raise_for_status()
            hits = r.json().get("hits", [])
            for h in hits:
                if h.get("points", 0) < 50:
                    continue
                items.append({
                    "source": f"Hacker News ({h.get('points', 0)} pts)",
                    "title": h.get("title", "").strip(),
                    "summary": h.get("story_text") or f"Score: {h.get('points')} | Comments: {h.get('num_comments')}",
                    "url": h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}",
                    "published": datetime.utcfromtimestamp(h.get("created_at_i", 0)).isoformat(),
                })
            logger.info(f"HN: {len(items)} qualifying stories")
        except Exception as e:
            logger.warning(f"HN fetch failed: {e}")
        return items

    def _fetch_reddit(self) -> list[dict]:
        items = []
        headers = {"User-Agent": "AINewsBot/1.0 (educational automation project)"}
        for sub in REDDIT_SUBS:
            try:
                url = f"https://www.reddit.com/r/{sub}/hot.json?limit=10&t=day"
                r = requests.get(url, headers=headers, timeout=10)
                r.raise_for_status()
                posts = r.json().get("data", {}).get("children", [])
                for p in posts:
                    d = p.get("data", {})
                    if d.get("score", 0) < 100 or d.get("over_18"):
                        continue
                    created_utc = d.get("created_utc", 0)
                    pub = datetime.utcfromtimestamp(created_utc).replace(tzinfo=timezone.utc)
                    if pub < self.cutoff:
                        continue
                    items.append({
                        "source": f"r/{sub} ({d.get('score')} upvotes)",
                        "title": d.get("title", "").strip(),
                        "summary": d.get("selftext", "")[:300] or d.get("title", ""),
                        "url": f"https://reddit.com{d.get('permalink', '')}",
                        "published": pub.isoformat(),
                    })
                logger.info(f"r/{sub}: {len(posts)} posts checked")
            except Exception as e:
                logger.warning(f"Reddit r/{sub} failed: {e}")
            time.sleep(0.5)
        return items

    # ─── Grok Ranking ───────────────────────────────────────────────────────

    def _rank_with_gemini(self, all_stories: list[dict], n: int = 5) -> list[dict]:
        if not all_stories:
            logger.error("No stories to rank!")
            return []

        seen_titles = set()
        unique = []
        for s in all_stories:
            key = re.sub(r"[^a-z0-9]", "", s["title"].lower())[:40]
            if key not in seen_titles:
                seen_titles.add(key)
                unique.append(s)

        logger.info(f"Ranking {len(unique)} unique stories with Grok...")

        stories_text = "\n\n".join([
            f"[{i+1}] SOURCE: {s['source']}\nTITLE: {s['title']}\nSUMMARY: {s['summary'][:200]}\nURL: {s['url']}"
            for i, s in enumerate(unique[:60])
        ])

        prompt = f"""You are an expert AI news curator for a popular Instagram account about AI and technology.

Today's date: {datetime.now().strftime('%B %d, %Y')}

Below are {len(unique[:60])} AI/tech news stories from the last 24 hours. Your job is to:
1. Select the TOP {n} most engaging, viral-worthy, genuinely important AI stories
2. Focus on: breakthrough announcements, major product launches, surprising research, industry shifts
3. AVOID: earnings reports, minor updates, duplicates, click-bait with no substance
4. Prioritize: stories that will make people say "wow, I didn't know that!"

For each selected story, provide:
- A punchy, scroll-stopping headline (under 12 words)
- 3 key bullet points (each under 20 words)
- 1 jaw-dropping stat or fact if available
- Why this matters to regular people (1 sentence)
- 5 relevant Instagram hashtags (popular but specific)

Return your response as a valid JSON array with exactly {n} objects. Format:
[
  {{
    "rank": 1,
    "original_title": "exact title from above",
    "source": "source name",
    "url": "url from above",
    "headline": "punchy scroll-stopping headline",
    "hook": "One shocking/surprising sentence that makes people stop scrolling",
    "bullets": ["bullet 1", "bullet 2", "bullet 3"],
    "key_stat": "The most impressive number or fact (can be null)",
    "why_it_matters": "Why this affects everyday people",
    "image_mood": "Describe in 5 words the visual mood for AI-generated background image",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
  }}
]

STORIES TO ANALYZE:
{stories_text}

Return ONLY valid JSON, no markdown, no explanation."""

        try:
            if self.api_key.startswith("AIzaSy"):
                logger.info("Querying Gemini API for story ranking...")
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                data = {
                    "contents": [{
                        "parts": [{
                            "text": prompt + "\n\nReturn ONLY valid JSON. Do not include markdown code block syntax."
                        }]
                    }],
                    "generationConfig": {
                        "responseMimeType": "application/json"
                    }
                }
                response = requests.post(url, headers=headers, json=data, timeout=40)
                if response.status_code != 200:
                    raise Exception(f"Gemini API returned status code {response.status_code}: {response.text}")
                text = response.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            else:
                logger.info("Querying Groq API for story ranking...")
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }
                data = {
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "model": "llama-3.3-70b-versatile",
                    "temperature": 0.7,
                    "response_format": {"type": "json_object"}
                }
                response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data, timeout=40)
                if response.status_code != 200:
                    raise Exception(f"Groq API returned status code {response.status_code}: {response.text}")
                text = response.json()["choices"][0]["message"]["content"].strip()

            if "```" in text:
                text = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
            ranked = json.loads(text)
            logger.info(f"API successfully ranked {len(ranked)} stories")
            return ranked
        except Exception as e:
            logger.error(f"Ranking failed: {e}")
            return [self._minimal_story(s) for s in unique[:n]]

    def _minimal_story(self, s: dict) -> dict:
        return {
            "rank": 1,
            "original_title": s["title"],
            "source": s["source"],
            "url": s["url"],
            "headline": s["title"][:80],
            "hook": s["summary"][:150],
            "bullets": [s["summary"][:100], "Check source for more details", "Follow for daily AI updates"],
            "key_stat": None,
            "why_it_matters": "Significant AI development worth knowing about",
            "image_mood": "clean minimal abstract light",
            "hashtags": ["#AI", "#ArtificialIntelligence", "#Tech", "#MachineLearning", "#AINews"],
        }

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _parse_date(self, entry) -> Optional[datetime]:
        for attr in ["published_parsed", "updated_parsed"]:
            t = getattr(entry, attr, None)
            if t:
                try:
                    return datetime(*t[:6], tzinfo=timezone.utc)
                except Exception:
                    pass
        return datetime.now(timezone.utc)

    def _strip_html(self, text: str) -> str:
        clean = re.sub(r"<[^>]+>", " ", text)
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean[:500]

    # ─── Main Entry ───────────────────────────────────────────────────────────

    def research(self, n_stories: int = 5) -> list[dict]:
        logger.info("=" * 60)
        logger.info(f"Starting news research for last {self.lookback_hours} hours")
        logger.info("=" * 60)

        all_stories = []

        logger.info("Fetching RSS feeds...")
        all_stories.extend(self._fetch_rss())

        logger.info("Fetching Hacker News...")
        all_stories.extend(self._fetch_hacker_news())

        logger.info("Fetching Reddit...")
        all_stories.extend(self._fetch_reddit())

        logger.info(f"Total raw stories collected: {len(all_stories)}")

        top_stories = self._rank_with_gemini(all_stories, n=n_stories)
        logger.info(f"Top {len(top_stories)} stories selected")

        return top_stories
