import { createDataClient } from "@/utils/supabase/server";

// Supabase-direct implementations of the read endpoints the Express backend
// serves. Response shapes mirror backend/src/index.ts so the pages work the
// same whether data comes from here or the proxied worker.

export class DatabaseOfflineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseOfflineError";
  }
}

type Post = {
  id: string;
  category: string;
  status: string;
  headline: string;
  script: any;
  video_url: string | null;
  caption: string;
  views: number;
  likes: number;
  comments: number;
  error: string | null;
  scheduled_for: string;
  posted_at: string | null;
  createdAt: string;
  updatedAt: string;
};

type Metric = {
  date: string;
  followers: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
};

function fail(error: { message: string; code?: string } | null, what: string): never {
  throw new DatabaseOfflineError(`${what}: ${error?.message || "unknown error"}`);
}

async function fetchPosts(limit?: number): Promise<Post[]> {
  const db = await createDataClient();
  let q = db.from("generated_posts").select("*").order("createdAt", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) fail(error, "generated_posts");
  return (data || []) as Post[];
}

async function fetchMetrics(limit?: number): Promise<Metric[]> {
  const db = await createDataClient();
  let q = db.from("analytics").select("*").order("date", { ascending: true });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) fail(error, "analytics");
  return (data || []) as Metric[];
}

async function fetchSettingsMap(): Promise<Record<string, string>> {
  const db = await createDataClient();
  const { data, error } = await db.from("settings").select("key,value");
  if (error) fail(error, "settings");
  return Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
}

const SETTINGS_KEYS: Record<string, string> = {
  igUsername: "instagram_username",
  igPassword: "instagram_password",
  igHandle: "instagram_handle",
  geminiKey: "google_ai_api_key",
  elevenLabsKey: "elevenlabs_api_key",
  pexelsKey: "pexels_api_key",
  targetBaseline: "target_baseline",
  growthMultiplier: "growth_multiplier",
  igAccessToken: "instagram_access_token",
  igAccountId: "instagram_account_id",
};

// Frontend pages read camelCase `videoUrl`; the table stores `video_url`.
function normalizePost(p: Post) {
  return { ...p, videoUrl: p.video_url, postedAt: p.posted_at, scheduledFor: p.scheduled_for };
}

export async function getStats() {
  const [reels, metrics, settingsMap] = await Promise.all([fetchPosts(12), fetchMetrics(30), fetchSettingsMap()]);

  const db = await createDataClient();
  const { data: uploaded, error } = await db
    .from("generated_posts")
    .select("views,likes")
    .eq("status", "UPLOADED");
  if (error) fail(error, "generated_posts aggregate");

  const sumViews = (uploaded || []).reduce((s: number, r: any) => s + (r.views || 0), 0);
  const sumLikes = (uploaded || []).reduce((s: number, r: any) => s + (r.likes || 0), 0);

  const isGraphApiActive = !!settingsMap["instagram_access_token"];
  const isVerified = reels.length > 0 || metrics.length > 0;
  const lastMetric = metrics[metrics.length - 1];
  const isAggressive = lastMetric ? lastMetric.impressions < 100 / 3 : false;
  const targetBaseline = parseInt(settingsMap["target_baseline"] || "100", 10) || 100;
  const source = isGraphApiActive ? "Instagram Graph API" : isVerified ? "database metrics" : "none";
  const now = new Date().toISOString();

  return {
    posts: reels.map(normalizePost),
    views: isVerified ? sumViews : null,
    totalLikes: isVerified ? sumLikes : null,
    followers: isVerified ? lastMetric?.followers ?? null : null,
    graphApiActive: isGraphApiActive,
    verifiedSource: isVerified,
    sources: {
      views: { metric: "views", source, rows: reels.length, updatedAt: now, verified: isVerified },
      likes: { metric: "likes", source, rows: reels.length, updatedAt: now, verified: isVerified },
      followers: { metric: "followers", source, rows: metrics.length, updatedAt: now, verified: isVerified },
    },
    daily_stats: metrics.reduce((acc: Record<string, any>, cur) => {
      acc[cur.date] = {
        total_views: cur.impressions || cur.reach || 0,
        target_views: targetBaseline,
        post_count: 3,
      };
      return acc;
    }, {}),
    settings: {
      aggressive_hooks: isAggressive,
      best_theme: "sunset_glow",
    },
  };
}

export async function getStrategistInsights() {
  const reels = await fetchPosts();
  const uploaded = reels.filter((r) => r.status === "UPLOADED");
  const maxViews = reels.length > 0 ? Math.max(...reels.map((r) => r.views || 0), 100) : 100;

  const predictionAccuracy = uploaded.slice(0, 7).map((r) => {
    let predicted = 75;
    const script = r.script || {};
    if (script.metadata?.viral_probability) predicted = script.metadata.viral_probability;
    else if (script.psychology?.virality_probability) predicted = script.psychology.virality_probability;
    const actual = Math.min(100, Math.round(((r.views || 0) / maxViews) * 100));
    return {
      reelId: r.id,
      headline: r.headline,
      predicted,
      actual,
      difference: Math.abs(predicted - actual),
      date: new Date(r.posted_at || r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });

  const hookHeatmap = uploaded.slice(0, 10).map((r) => {
    const hook = r.script?.slides?.[0]?.headline || r.headline;
    return { hook, scrollStop: 85, retention: 75, saves: 0, shares: 0, views: r.views || 0 };
  });

  const audienceMap = new Map<string, { views: number; followersGained: number }>();
  reels.forEach((r) => {
    const audience =
      r.script?.metadata?.target_audience || r.script?.psychology?.target_audience || "AI Enthusiasts";
    const cur = audienceMap.get(audience) || { views: 0, followersGained: 0 };
    audienceMap.set(audience, { views: cur.views + (r.views || 0), followersGained: cur.followersGained });
  });
  const audienceConversion = Array.from(audienceMap.entries()).map(([segment, d]) => ({
    segment,
    views: d.views,
    followersGained: d.followersGained,
    conversionRate: d.views > 0 ? parseFloat((d.followersGained / d.views).toFixed(4)) : 0,
  }));

  return {
    predictionAccuracy,
    hookHeatmap,
    audienceConversion,
    retentionCurve: [],
    themePerformance: [],
    aiLearningFeed: [],
    growthForecast: [],
    postingOpportunityRadar: [],
    strategyAdaptationTimeline: [],
    hasData: uploaded.length > 0,
  };
}

export async function getHealth() {
  const db = await createDataClient();
  let dbStatus: "connected" | "offline" = "connected";
  let reels = 0;
  let metrics = 0;
  let settings = 0;
  try {
    const [a, b, c] = await Promise.all([
      db.from("generated_posts").select("*", { count: "exact", head: true }),
      db.from("analytics").select("*", { count: "exact", head: true }),
      db.from("settings").select("*", { count: "exact", head: true }),
    ]);
    if (a.error || b.error || c.error) throw a.error || b.error || c.error;
    reels = a.count || 0;
    metrics = b.count || 0;
    settings = c.count || 0;
  } catch {
    dbStatus = "offline";
  }

  return {
    status: dbStatus === "connected" ? "degraded" : "unhealthy",
    timestamp: new Date().toISOString(),
    workerDeployed: false,
    redis: { host: "n/a", port: 0, status: "disconnected" },
    queues: {},
    workers: {},
    database: { status: dbStatus, reels, metrics, settings },
    system: null,
  };
}

export async function getSettings() {
  const map = await fetchSettingsMap();
  const out: Record<string, string> = {};
  for (const [field, key] of Object.entries(SETTINGS_KEYS)) {
    out[field] = map[key] || "";
  }
  out.targetBaseline = out.targetBaseline || "100";
  out.growthMultiplier = out.growthMultiplier || "15%";
  return out;
}

export async function saveSettings(body: Record<string, unknown>) {
  const db = await createDataClient();
  const { data: existing, error: readErr } = await db.from("settings").select("id,key");
  if (readErr) fail(readErr, "settings read");
  const idByKey = new Map((existing || []).map((r: any) => [r.key, r.id]));

  const rows = Object.entries(SETTINGS_KEYS)
    .filter(([field]) => typeof body[field] === "string")
    .map(([field, key]) => ({
      id: idByKey.get(key) || crypto.randomUUID(),
      key,
      value: body[field] as string,
      updatedAt: new Date().toISOString(),
    }));
  if (rows.length === 0) return;

  const { error } = await db.from("settings").upsert(rows, { onConflict: "key" });
  if (error) fail(error, "settings upsert");
}
