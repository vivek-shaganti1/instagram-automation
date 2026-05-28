"use client";

import { useEffect, useState } from "react";
import { Play, RotateCw, Sparkles, TrendingUp, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Failed to load statistics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const triggerPost = async (category: string) => {
    setActionLoading(category);
    setMessage(`Queued ${category.toUpperCase()} Reel job...`);
    try {
      const res = await fetch("http://localhost:8000/api/post-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Success! Job queued. Job ID: ${data.jobId}`);
        fetchStats();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage("Failed to queue job.");
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const syncStats = async () => {
    setActionLoading("sync");
    setMessage("Syncing metrics with Instagram Graph API...");
    try {
      const res = await fetch("http://localhost:8000/api/sync-stats", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage("Instagram stats synced successfully!");
        fetchStats();
      } else {
        setMessage("Failed to sync insights.");
      }
    } catch (e) {
      setMessage("Failed to connect to backend server.");
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-light">
        <RotateCw className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
        <span>Loading AI Signal Dashboard...</span>
      </div>
    );
  }

  const posts = stats?.posts || [];
  const totalViews = posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
  const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.likes || 0), 0);

  // Calculate current target views (100 * 1.15^days since baseline May 28)
  const calculateTarget = () => {
    const start = new Date("2026-05-28");
    const diff = Math.abs(new Date().getTime() - start.getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return Math.floor(100 * Math.pow(1 + 0.15, days));
  };

  const targetViews = calculateTarget();

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      {/* Toast Notification message */}
      {message && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-violet-500/30 text-slate-200 px-6 py-4 rounded-xl shadow-2xl z-50 transition max-w-sm">
          {message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="font-['Space_Grotesk'] text-3xl font-extrabold text-white">Creator Hub</h1>
          <p className="text-slate-400 text-sm font-light">Manage, trigger, and track your daily Reels automation.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={syncStats} 
            disabled={actionLoading !== null}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2"
          >
            <RotateCw className={`w-4 h-4 ${actionLoading === "sync" ? "animate-spin" : ""}`} />
            <span>Sync Instagram Insights</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="glass-panel p-6 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Total Reels Views</span>
          <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-2">{totalViews.toLocaleString()}</div>
          <span className="text-xs text-cyan-400 font-semibold">📈 Live Engagement</span>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Growth Target</span>
          <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-2">{targetViews.toLocaleString()}</div>
          <span className="text-xs text-violet-400 font-semibold">15% daily exponential growth</span>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Total Likes</span>
          <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-2">{totalLikes.toLocaleString()}</div>
          <span className="text-xs text-slate-400">Synced from posts</span>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-2">AI Optimization Mode</span>
          <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-2">
            {stats?.settings?.aggressive_hooks ? "Aggressive Hook" : "Standard"}
          </div>
          <span className="text-xs text-slate-400">Adjusts hook strategy if views drop</span>
        </div>
      </div>

      {/* Manual Triggers Panel */}
      <div className="glass-panel p-8 rounded-2xl mb-8">
        <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white mb-4">Manual Automation Override</h2>
        <p className="text-slate-400 text-sm font-light mb-6">Force trigger a Reel render and upload right now. The worker processes these asynchronously in the background.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <button 
            onClick={() => triggerPost("ai")}
            disabled={actionLoading !== null}
            className="p-4 rounded-xl border border-white/5 bg-white/5 hover:border-cyan-500/30 transition text-left flex items-center justify-between group"
          >
            <div>
              <div className="font-semibold text-white">Trigger AI Reel</div>
              <div className="text-xs text-slate-400 font-light mt-1">AI Tools & Tech news</div>
            </div>
            <Play className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition" />
          </button>

          <button 
            onClick={() => triggerPost("business")}
            disabled={actionLoading !== null}
            className="p-4 rounded-xl border border-white/5 bg-white/5 hover:border-violet-500/30 transition text-left flex items-center justify-between group"
          >
            <div>
              <div className="font-semibold text-white">Trigger Money Reel</div>
              <div className="text-xs text-slate-400 font-light mt-1">Startup Ideas & Side Hustles</div>
            </div>
            <Play className="w-5 h-5 text-violet-400 group-hover:scale-110 transition" />
          </button>

          <button 
            onClick={() => triggerPost("motivation")}
            disabled={actionLoading !== null}
            className="p-4 rounded-xl border border-white/5 bg-white/5 hover:border-amber-500/30 transition text-left flex items-center justify-between group"
          >
            <div>
              <div className="font-semibold text-white">Trigger Motivation Reel</div>
              <div className="text-xs text-slate-400 font-light mt-1">Discipline & Billionaire habits</div>
            </div>
            <Play className="w-5 h-5 text-amber-400 group-hover:scale-110 transition" />
          </button>
        </div>
      </div>

      {/* Recent Reels List */}
      <div>
        <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white mb-6">Recent Automated Posts</h2>
        {posts.length === 0 ? (
          <div className="glass-panel p-8 text-center text-slate-400 font-light rounded-2xl">
            No Reels posted yet. Wait for scheduler or trigger a post now.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {posts.map((post: any) => {
              const formattedDate = new Date(post.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });
              
              return (
                <div key={post.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[320px]">
                  {/* Category tag */}
                  <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{post.category}</span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      {post.status === "UPLOADED" ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{post.status}</span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="text-xs text-slate-400 mb-1">{formattedDate}</div>
                      <h4 className="font-semibold text-white mb-2 leading-snug">{post.headline}</h4>
                      <p className="text-slate-400 text-xs line-clamp-3 font-light leading-relaxed">{post.caption}</p>
                    </div>
                    {/* Stats */}
                    <div className="flex gap-4 border-t border-white/5 pt-4 text-xs font-semibold text-slate-300">
                      <div>Views: <span className="text-white">{post.views.toLocaleString()}</span></div>
                      <div>Likes: <span className="text-white">{post.likes.toLocaleString()}</span></div>
                      <div>Comments: <span className="text-white">{post.comments.toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
