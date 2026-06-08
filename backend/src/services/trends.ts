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

    // 2. Google News RSS feed
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

    if (trends.length === 0) {
      throw new Error("TrendService - Failed to fetch any live trends.");
    }

    return trends;
  }
}
