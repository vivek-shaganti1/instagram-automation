import axios from "axios";

export interface TrendData {
  keyword: string;
  source: string;
  narrative: string;
  controversy: string;
}

export class TrendService {
  async fetchLatestTrends(): Promise<TrendData[]> {
    const trends: TrendData[] = [];

    // 1. Fetch HackerNews Top Story
    try {
      const hnTopRes = await axios.get("https://hacker-news.firebaseio.com/v0/topstories.json", { timeout: 3000 });
      if (Array.isArray(hnTopRes.data) && hnTopRes.data.length > 0) {
        const topId = hnTopRes.data[0];
        const detailRes = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${topId}.json`, { timeout: 2000 });
        if (detailRes.data && detailRes.data.title) {
          trends.push({
            keyword: detailRes.data.title,
            source: "Hacker News",
            narrative: `Top discussion: ${detailRes.data.title}`,
            controversy: "Developer community debate on efficiency, openness, and utility."
          });
        }
      }
    } catch (e: any) {
      console.warn("TrendService - Failed to fetch HackerNews:", e.message);
    }

    // 2. TechCrunch RSS feed simulation/fallback
    try {
      const tcRes = await axios.get("https://news.google.com/rss/search?q=AI+startup+funding&hl=en-US&gl=US&ceid=US:en", { timeout: 3500 });
      const titles = tcRes.data.match(/<title>([^<]+)<\/title>/g);
      if (titles && titles.length > 1) {
        // Skip first feed title, pick first article title
        const cleanTitle = titles[1].replace(/<title>|<\/title>/g, "").trim();
        trends.push({
          keyword: cleanTitle,
          source: "Google News (Tech)",
          narrative: `Trending news: ${cleanTitle}`,
          controversy: "Market shifts, funding hype, valuation bubbles, and corporate execution."
        });
      }
    } catch (e: any) {
      console.warn("TrendService - Failed to fetch Tech News RSS:", e.message);
    }

    // 3. Populate default high-viral fallback triggers if feeds are empty or blocked
    if (trends.length === 0) {
      trends.push(
        {
          keyword: "AI Agent Swarms replacing developers",
          source: "Reddit Singularity",
          narrative: "Devin and agency replacement models running autonomously.",
          controversy: "Displacement of entry-level engineers and technical debt."
        },
        {
          keyword: "NVIDIA CUDA dominance vs OpenSource",
          source: "X/Twitter Tech",
          narrative: "Competing silicon and software frameworks trying to break the monopoly.",
          controversy: "Hardware exclusivity and software vendor lock-in."
        },
        {
          keyword: "Billionaire productivity disillusionment",
          source: "Hacker News",
          narrative: "Founders burning out on hyper-optimization and quitting biohacking.",
          controversy: "Real business value vs influencer vanity habits."
        }
      );
    }

    return trends;
  }
}
