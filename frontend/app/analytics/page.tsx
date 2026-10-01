"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { RotateCw, TrendingUp } from "lucide-react";
import { getApiUrl } from "@/utils/api";

export default function AnalyticsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(getApiUrl("/api/stats"))
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/login?next=/analytics");
          return null;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.details ? `${data.error} — ${data.details}` : (data.error || "Failed to load analytics"));
        return data;
      })
      .then((data) => {
        if (!data) return;
        setStats(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError(e?.message || "Failed to load analytics");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-light">
        <RotateCw className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
        <span>Loading insights charts...</span>
      </div>
    );
  }

  // Parse daily metrics for graph
  const dailyStats = stats?.daily_stats || {};
  const sortedDates = Object.keys(dailyStats).sort();

  const chartData = sortedDates.length > 0 
    ? sortedDates.map((date) => ({
        name: date.split("-").slice(1).join("/"), // "MM/DD"
        "Actual Views": dailyStats[date].total_views,
        "Target Views": dailyStats[date].target_views,
      }))
    : [];

  // Average views per category from the real post list.
  const posts: any[] = stats?.posts || [];
  const categories = [
    { key: "ai", label: "AI Reels", color: "bg-cyan-500" },
    { key: "business", label: "Business & Money Reels", color: "bg-violet-500" },
    { key: "motivation", label: "Motivation Reels", color: "bg-amber-500" },
  ].map((c) => {
    const inCat = posts.filter((p) => (p.category || "").toLowerCase() === c.key);
    const avg = inCat.length ? Math.round(inCat.reduce((s, p) => s + (p.views || 0), 0) / inCat.length) : 0;
    return { ...c, avg, count: inCat.length };
  });
  const maxAvg = Math.max(...categories.map((c) => c.avg), 1);
  const aggressive = !!stats?.settings?.aggressive_hooks;
  const bestTheme = (stats?.settings?.best_theme || "sunset_glow").replace(/_/g, " ");
  const updatedAt = stats?.sources?.views?.updatedAt ? new Date(stats.sources.views.updatedAt) : null;
  const targetBaseline = sortedDates.length ? dailyStats[sortedDates[0]].target_views : 100;

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-['Space_Grotesk'] text-3xl font-extrabold text-white">Analytics Hub</h1>
        <p className="text-slate-400 text-sm font-light">Track the exponential progression of your Instagram reach.</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-950/50 border border-red-500/50 rounded-xl text-center text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Chart Card */}
      <div className="glass-panel p-6 rounded-2xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-semibold text-white">Views Progression vs Exponential Goal</h3>
            <p className="text-slate-400 text-xs font-light">Target increases by 15% daily starting at {targetBaseline} views.</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-400 text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Optimal Growth Track</span>
          </div>
        </div>

        <div className="h-[360px] w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm font-light text-center px-6">
              No daily metrics yet. Analytics appear once Instagram insights have been synced from the Dashboard.
            </div>
          ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ fontWeight: "bold" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
              <Area type="monotone" dataKey="Actual Views" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
              <Area type="monotone" dataKey="Target Views" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorTarget)" />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Strategy Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-2xl">
          <h4 className="font-semibold text-white mb-2">Category Performance Index</h4>
          <p className="text-slate-400 text-xs leading-relaxed font-light mb-4">Views breakdowns across categories dynamically direct which category receives high-impact placement.</p>
          <div className="space-y-3">
            {categories.map((c) => (
              <div key={c.key}>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>{c.label}</span>
                  <span>{c.count ? `Average: ${c.avg.toLocaleString()} views (${c.count})` : "No reels yet"}</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className={`${c.color} h-full rounded-full`} style={{ width: `${Math.round((c.avg / maxAvg) * 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-white mb-2">AI Viral Optimization Insights</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-light mb-4">The optimization engine reads watch-time statistics and shifts themes or pacing parameters autonomously.</p>
            <ul className="text-xs text-slate-300 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Best theme detected: <strong className="capitalize">{bestTheme}</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Optimized posting hours: <strong>8 AM, 2 PM, 8 PM</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${aggressive ? "bg-rose-400" : "bg-amber-400"}`}></span>
                <span>
                  Aggressive hook state: <strong>{aggressive ? "Active" : "Deactivated"}</strong>{" "}
                  {aggressive ? "(views below growth target)" : "(growth target met)"}
                </span>
              </li>
            </ul>
          </div>
          <div className="text-slate-400 text-[10px] uppercase font-semibold tracking-wider pt-4 border-t border-white/5">
            {updatedAt ? `Data refreshed ${updatedAt.toLocaleTimeString()}` : "Awaiting first data sync"}
          </div>
        </div>
      </div>
    </div>
  );
}
