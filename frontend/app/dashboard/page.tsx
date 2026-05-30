"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, RotateCw, Sparkles, TrendingUp, CheckCircle, Clock, LogOut, BarChart3, LineChart, Target, Eye, Bookmark, Flame, Zap, Calendar, Award, Activity, ShieldAlert, Cpu, Server, Database } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [stressResults, setStressResults] = useState<any>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"strategy" | "intelligence" | "health">("strategy");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/stats");
      const data = await res.json();
      setStats(data);
      
      const insightsRes = await fetch("http://localhost:8000/api/strategist-insights");
      const insightsData = await insightsRes.json();
      setInsights(insightsData);

      const healthRes = await fetch("http://localhost:8000/api/health");
      const healthData = await healthRes.json();
      setHealth(healthData);

      try {
        const stressRes = await fetch("http://localhost:8000/api/stress-results");
        if (stressRes.ok) {
          const stressData = await stressRes.json();
          setStressResults(stressData);
        }
      } catch (stressErr) {
        console.warn("Failed to fetch stress results");
      }

      try {
        const deployRes = await fetch("http://localhost:8000/api/deployment-status");
        if (deployRes.ok) {
          const deployData = await deployRes.json();
          setDeploymentStatus(deployData);
        }
      } catch (deployErr) {
        console.warn("Failed to fetch deployment status");
      }
    } catch (e) {
      console.error("Failed to load statistics:", e);
    } finally {
      setLoading(false);
    }
  };

  const runBackup = async () => {
    setActionLoading("backup");
    setMessage("Initiating automated production database and asset backup...");
    try {
      const res = await fetch("http://localhost:8000/api/run-backup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage("Database and assets backed up successfully!");
        fetchStats();
      } else {
        setMessage(`Backup failed: ${data.error}`);
      }
    } catch (e) {
      setMessage("Failed to trigger backup.");
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const triggerStressTest = async () => {
    setActionLoading("stress");
    setMessage("Running autonomous stress testing & validation audit...");
    try {
      const res = await fetch("http://localhost:8000/api/run-stress-test", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage("Stress test completed successfully!");
        fetchStats();
      } else {
        setMessage(`Stress test failed: ${data.error}`);
      }
    } catch (e) {
      setMessage("Failed to run stress test.");
    } finally {
      setActionLoading(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  useEffect(() => {
    const cachedUser = localStorage.getItem("user");
    if (!cachedUser || cachedUser === "undefined") {
      router.push("/login");
      return;
    }
    try {
      const parsed = JSON.parse(cachedUser);
      if (parsed && parsed.email) {
        setUserEmail(parsed.email);
        fetchStats();
        // Setup live polling for real-time status updates
        const intervalId = setInterval(fetchStats, 5000);
        return () => clearInterval(intervalId);
      } else {
        localStorage.removeItem("user");
        router.push("/login");
      }
    } catch (e) {
      console.error("Failed to parse user session JSON:", e);
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

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
  const totalViews = stats?.totalViews !== undefined ? stats.totalViews : posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
  const totalLikes = stats?.totalLikes !== undefined ? stats.totalLikes : posts.reduce((sum: number, p: any) => sum + (p.likes || 0), 0);

  // Retrieve growth target values from latest daily metric in the database
  const getLatestTarget = () => {
    if (!stats?.daily_stats) return 100;
    const dates = Object.keys(stats.daily_stats).sort();
    if (dates.length === 0) return 100;
    const latestDate = dates[dates.length - 1];
    return stats.daily_stats[latestDate]?.target_views || 100;
  };

  const targetViews = getLatestTarget();

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
          <p className="text-slate-400 text-sm font-light">
            Welcome, <span className="text-violet-400 font-semibold">{userEmail}</span>. Manage your daily Reels automation.
          </p>
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
          
          <button 
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="glass-panel p-6 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Total Reels Views</span>
          <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-2">{totalViews.toLocaleString()}</div>
          <span className="text-xs text-cyan-400 font-semibold">📈 Live Database Metrics</span>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Growth Target</span>
          <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-2">{targetViews.toLocaleString()}</div>
          <span className="text-xs text-violet-400 font-semibold">Loaded from DailyMetric table</span>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Total Likes</span>
          <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-2">{totalLikes.toLocaleString()}</div>
          <span className="text-xs text-slate-400">Synced from database posts</span>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block mb-2">AI Optimization Mode</span>
          <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-2">
            {stats?.settings?.aggressive_hooks ? "Aggressive Hook" : "Standard"}
          </div>
          <span className="text-xs text-slate-400">Adjusts hook strategy if views drop</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-4 mb-8">
        <button
          onClick={() => setActiveTab("strategy")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "strategy" 
              ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 bg-white/5 border border-white/10"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Strategy Center</span>
        </button>
        <button
          onClick={() => setActiveTab("intelligence")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "intelligence" 
              ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 bg-white/5 border border-white/10"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Media Intelligence Brain</span>
        </button>
        <button
          onClick={() => setActiveTab("health")}
          className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "health" 
              ? "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "text-slate-400 hover:text-slate-200 bg-white/5 border border-white/10"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>System Infrastructure</span>
        </button>
      </div>

      {activeTab === "strategy" && (
        <>
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
                    <div key={post.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[350px]">
                      {/* Category tag */}
                      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/30">
                        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{post.category}</span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          {post.status === "UPLOADED" ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                          ) : post.status === "FAILED" ? (
                            <span className="text-red-400 font-bold font-mono">X FAILED</span>
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
                          {post.error && (
                            <p className="text-red-400 text-[10px] line-clamp-2 mt-2 bg-red-950/20 p-2 rounded border border-red-500/20">{post.error}</p>
                          )}
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
        </>
      )}

      {activeTab === "intelligence" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section title */}
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white">Autonomous Performance Intelligence</h2>
          </div>

          {insights ? (
            <>
              {/* 3x3 Grid of Advanced Panels */}
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* 1. Prediction Accuracy Graph */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-white mb-4 tracking-wide uppercase text-slate-300 flex items-center gap-2">
                      <Target className="w-4 h-4 text-cyan-400" />
                      Prediction Accuracy Graph
                    </h3>
                    <div className="space-y-4">
                      {insights.predictionAccuracy?.map((item: any, idx: number) => (
                        <div key={idx} className="text-xs">
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span className="truncate max-w-[150px]">{item.headline}</span>
                            <span className="font-mono">P: <span className="text-cyan-400">{item.predicted}%</span> | A: <span className="text-indigo-400">{item.actual}%</span></span>
                          </div>
                          <div className="relative w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                            <div className="bg-cyan-500 h-full transition-all" style={{ width: `${item.predicted}%`, opacity: 0.5 }} />
                            <div className="absolute top-0 left-0 bg-indigo-500 h-full transition-all" style={{ width: `${item.actual}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-4 pt-2 border-t border-white/5">
                    Compares AI composite predictions vs scaled actual views
                  </div>
                </div>

                {/* 2. Hook Performance Heatmap */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-white mb-4 tracking-wide uppercase text-slate-300 flex items-center gap-2">
                      <Flame className="w-4 h-4 text-pink-400" />
                      Hook Performance Heatmap
                    </h3>
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {insights.hookHeatmap?.map((item: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
                          <span className="text-[11px] font-medium text-white truncate">{item.hook}</span>
                          <div className="flex justify-between items-center mt-2 text-[9px] text-slate-400 font-mono">
                            <span>Scroll-Stop: <span className="text-emerald-400">{item.scrollStop}%</span></span>
                            <span>Retention: <span className="text-cyan-400">{item.retention}%</span></span>
                            <span>Saves: <span className="text-violet-400">{item.saves}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-3 pt-2 border-t border-white/5">
                    Scroll-stop drop heatmap metrics
                  </div>
                </div>

                {/* 3. Audience Conversion Matrix */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-white mb-4 tracking-wide uppercase text-slate-300 flex items-center gap-2">
                      <Award className="w-4 h-4 text-violet-400" />
                      Audience Conversion Matrix
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-400 font-semibold pb-1.5">
                            <th className="pb-1.5">Segment</th>
                            <th className="pb-1.5 text-right">Views</th>
                            <th className="pb-1.5 text-right">Followers</th>
                            <th className="pb-1.5 text-right">CR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {insights.audienceConversion?.map((item: any, i: number) => (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                              <td className="py-2 text-white font-medium capitalize truncate max-w-[80px]">{item.segment}</td>
                              <td className="py-2 text-right font-mono text-slate-300">{item.views?.toLocaleString()}</td>
                              <td className="py-2 text-right font-mono text-cyan-400">+{item.followersGained}</td>
                              <td className="py-2 text-right font-mono text-violet-400">{(item.conversionRate * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-3 pt-2 border-t border-white/5">
                    View-to-follower conversion rate mapping
                  </div>
                </div>

                {/* 4. Retention Curve Analytics */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-white mb-4 tracking-wide uppercase text-slate-300 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-indigo-400" />
                      Retention Curve Analytics
                    </h3>
                    <div className="space-y-3">
                      {insights.retentionCurve?.map((item: any, i: number) => (
                        <div key={i} className="text-xs">
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>{item.second}s mark</span>
                            <span className="font-mono text-violet-400 font-bold">{item.retention}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full" style={{ width: `${item.retention}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-3 pt-2 border-t border-white/5">
                    Estimated mid-video dropout decay curve
                  </div>
                </div>

                {/* 5. Theme Performance Ranking */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-white mb-4 tracking-wide uppercase text-slate-300 flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-cyan-400" />
                      Theme Performance Ranking
                    </h3>
                    <div className="space-y-2.5">
                      {insights.themePerformance?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 rounded-lg border border-white/5">
                          <div className="truncate max-w-[120px]">
                            <span className="text-white font-medium capitalize block truncate">{item.theme.replace(/_/g, ' ')}</span>
                            <span className="text-[9px] text-slate-400 block">{item.postCount} posts</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-cyan-400 font-mono font-bold block">{item.averageViews?.toLocaleString()}</span>
                            <span className="text-slate-400 font-mono text-[9px]">{(item.averageEngagement * 100).toFixed(1)}% eng</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-3 pt-2 border-t border-white/5">
                    Average views per dynamic layout theme
                  </div>
                </div>

                {/* 6. AI Learning Feed */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-white mb-4 tracking-wide uppercase text-slate-300 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      AI Learning Feed
                    </h3>
                    <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                      {insights.aiLearningFeed?.map((item: any, i: number) => (
                        <div key={i} className="text-xs p-2 rounded-lg bg-slate-900/40 border border-white/5 flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className={`px-1.5 py-0.2 text-[8px] font-bold uppercase rounded ${
                              item.severity === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                              item.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-cyan-500/20 text-cyan-400'
                            }`}>{item.severity}</span>
                            <span className="text-[9px] text-slate-500 font-mono">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-slate-300 font-light leading-normal text-[11px]">{item.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-3 pt-2 border-t border-white/5">
                    Real-time self-corrective strategic logs
                  </div>
                </div>

                {/* 7. Growth Forecast Engine */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-white mb-4 tracking-wide uppercase text-slate-300 flex items-center gap-2">
                      <LineChart className="w-4 h-4 text-emerald-400" />
                      Growth Forecast Engine
                    </h3>
                    <div className="space-y-2.5">
                      {insights.growthForecast?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                          <div>
                            <span className="text-white font-semibold">{item.date}</span>
                            <span className="text-[9px] text-slate-400 block">Projected Views</span>
                          </div>
                          <div className="text-right">
                            <span className="text-cyan-400 font-mono font-bold block">{item.projectedViews?.toLocaleString()}</span>
                            <span className="text-violet-400 font-mono text-[9px]">+{item.projectedFollowers} followers</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-3 pt-2 border-t border-white/5">
                    Dynamic predictive models for rolling 7-day velocity
                  </div>
                </div>

                {/* 8. Posting Opportunity Radar */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-white mb-4 tracking-wide uppercase text-slate-300 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-violet-400" />
                      Posting Opportunity Radar
                    </h3>
                    <div className="space-y-3">
                      {insights.postingOpportunityRadar?.map((item: any, i: number) => (
                        <div key={i} className="text-xs">
                          <div className="flex justify-between text-slate-400 mb-0.5">
                            <span>Time Slot: <span className="text-white font-bold">{item.hour}</span></span>
                            <span className="font-mono text-cyan-400">Score: {item.score}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full rounded-full" style={{ width: `${item.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-3 pt-2 border-t border-white/5">
                    Calculates peak impressions based on target activity
                  </div>
                </div>

                {/* 9. Strategy Adaptation Timeline */}
                <div className="glass-panel p-6 rounded-2xl col-span-1 md:col-span-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-white mb-4 tracking-wide uppercase text-slate-300 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      Strategy Adaptation Timeline
                    </h3>
                    <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
                      {insights.strategyAdaptationTimeline?.map((item: any, i: number) => (
                        <div key={i} className="border-l-2 border-indigo-500/50 pl-4 py-2 text-xs flex justify-between items-start gap-4 hover:bg-white/5 rounded-r-lg transition">
                          <div>
                            <span className="text-white font-semibold block">{item.rule}</span>
                            <p className="text-slate-400 mt-0.5">{item.action}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-[9px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded block mb-1">Trigger: {item.triggerValue}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-3 pt-2 border-t border-white/5">
                    Chronological audit log of autonomous estrategist rules triggering layout and theme changes
                  </div>
                </div>

              </div>
            </>
          ) : (
            <div className="glass-panel p-8 text-center text-slate-400 font-light rounded-2xl">
              Insights processing... Click Sync Stats to populate.
            </div>
          )}
        </div>
      )}

      {activeTab === "health" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section title */}
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white">System Infrastructure & Orchestration</h2>
          </div>

          {/* Stress test & Resilience Audit panel */}
          <div className="glass-panel p-6 rounded-2xl mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Autonomous Resilience Operations Control
                </h3>
                <p className="text-slate-400 text-xs font-light mt-1">
                  Run accelerated 24-hour simulation cycles, inject mock API/Redis disconnect faults, and benchmark execution performance.
                </p>
              </div>
              <button
                onClick={triggerStressTest}
                disabled={actionLoading === "stress"}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-500 to-indigo-500 hover:from-rose-600 hover:to-indigo-600 transition flex items-center gap-2 shadow-lg shadow-indigo-500/10"
              >
                <RotateCw className={`w-3.5 h-3.5 ${actionLoading === "stress" ? "animate-spin" : ""}`} />
                <span>{actionLoading === "stress" ? "Stress Testing..." : "Trigger Resilience Audit"}</span>
              </button>
            </div>

            {stressResults && (
              <div className="space-y-6 animate-fadeIn">
                {/* Score indicators */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">System Stability</span>
                    <span className="text-xl font-bold font-['Space_Grotesk'] text-emerald-400">{stressResults.scores?.stability}%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Render Efficiency</span>
                    <span className="text-xl font-bold font-['Space_Grotesk'] text-cyan-400">{stressResults.scores?.render}%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Upload Reliability</span>
                    <span className="text-xl font-bold font-['Space_Grotesk'] text-violet-400">{stressResults.scores?.upload}%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Resilience Index</span>
                    <span className="text-xl font-bold font-['Space_Grotesk'] text-amber-400">{stressResults.scores?.resilience}%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center col-span-2 md:col-span-1">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Heap Allocation</span>
                    <span className="text-xl font-bold font-['Space_Grotesk'] text-rose-400">+{stressResults.metrics?.memoryDeltaMb}MB</span>
                  </div>
                </div>

                {/* Audit summary lists */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Simulated Stress Metrics</h4>
                    <div className="divide-y divide-white/5 text-xs text-slate-400">
                      <div className="py-2.5 flex justify-between">
                        <span>Accelerated cycles simulated</span>
                        <span className="font-mono text-white">{stressResults.metrics?.acceleratedCycles} hours</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span>Simulated API rate blocks (Gemini)</span>
                        <span className="font-mono text-amber-400 font-bold">{stressResults.metrics?.aiFailuresMocked} recovered</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span>Simulated Redis dropouts (BullMQ)</span>
                        <span className="font-mono text-amber-400 font-bold">{stressResults.metrics?.redisDisconnectsMocked} self-healed</span>
                      </div>
                      <div className="py-2.5 flex justify-between">
                        <span>Post verification intercepts</span>
                        <span className="font-mono text-emerald-400 font-bold">{stressResults.metrics?.uploadFailuresMocked} prevented duplicate</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Resilience Simulation Log</h4>
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {stressResults.logs?.map((l: any, idx: number) => {
                        const statusDot = 
                          l.status === "error" ? "bg-rose-500" :
                          l.status === "warning" ? "bg-amber-500" : "bg-emerald-500";
                        return (
                          <div key={idx} className="p-2.5 rounded-lg bg-slate-900/40 border border-white/5 flex gap-2.5 items-start text-[11px]">
                            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${statusDot}`} />
                            <div>
                              <div className="font-bold text-white">{l.event} <span className="text-[9px] text-slate-500 font-normal">Hour {l.hour}</span></div>
                              <p className="text-slate-400 mt-0.5 leading-normal">{l.details}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Production Deployment & Operations Control */}
          {deploymentStatus && (
            <div className="glass-panel p-6 rounded-2xl mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    Production Deployment & Operations
                  </h3>
                  <p className="text-slate-400 text-xs font-light mt-1">
                    Manage system backups, monitor storage volumes, and inspect running host PM2 processes.
                  </p>
                </div>
                <button
                  onClick={runBackup}
                  disabled={actionLoading === "backup"}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition flex items-center gap-2 shadow-lg shadow-teal-500/10"
                >
                  <Database className={`w-3.5 h-3.5 ${actionLoading === "backup" ? "animate-spin" : ""}`} />
                  <span>{actionLoading === "backup" ? "Backing up..." : "Trigger Database Backup"}</span>
                </button>
              </div>

              {/* Status and Resource Grid */}
              <div className="grid md:grid-cols-4 gap-6 mb-6">
                {/* Disk utilization */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">Storage volume disk space</span>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xl font-bold font-['Space_Grotesk'] text-white">
                        {deploymentStatus.storage?.used} / {deploymentStatus.storage?.total}
                      </span>
                      <span className="text-xs text-emerald-400 font-semibold">{deploymentStatus.storage?.percentage}% used</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${deploymentStatus.storage?.percentage}%` }} />
                    </div>
                  </div>
                </div>

                {/* Network latencies */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">Gateway network status</span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Instagram Graph API</span>
                        <span className="font-mono text-white font-bold">{deploymentStatus.network?.latencyToInstagram}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gemini LLM Endpoint</span>
                        <span className="font-mono text-white font-bold">{deploymentStatus.network?.latencyToGemini}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Backups summary */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">Backup retention logs</span>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-400">Total Archives Saved</span>
                      <span className="font-mono text-white font-bold">{deploymentStatus.backups?.count}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Last: {deploymentStatus.backups?.lastBackupPath}
                    </div>
                  </div>
                </div>

                {/* Container states */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-2">Active Docker Containers</span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-400">saas_postgres</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-400">saas_redis</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-400">saas_backend</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-slate-400">saas_frontend</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PM2 processes table */}
              <div className="border-t border-white/5 pt-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Host process status grid (PM2)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 font-semibold pb-2">
                        <th className="pb-2 text-left pl-2">App Name</th>
                        <th className="pb-2 text-right">Status</th>
                        <th className="pb-2 text-right">Restarts</th>
                        <th className="pb-2 text-right">Memory Usage</th>
                        <th className="pb-2 text-right pr-2">CPU Usage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {deploymentStatus.processes?.map((proc: any, i: number) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 text-white font-semibold pl-2 font-mono">{proc.name}</td>
                          <td className="py-2.5 text-right">
                            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                              {proc.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-slate-400">{proc.restarts}</td>
                          <td className="py-2.5 text-right text-white font-bold">{proc.memory}</td>
                          <td className="py-2.5 text-right text-cyan-400 pr-2">{proc.cpu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {health ? (
            <div className="space-y-8">
              {/* Top Summary Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* System Stats */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      Runtime Environment
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-400">Process Memory (Heap)</span>
                        <span className="font-mono text-white font-bold">{health.system?.memory?.heapUsed} / {health.system?.memory?.heapTotal}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-400">RSS Memory</span>
                        <span className="font-mono text-cyan-400 font-bold">{health.system?.memory?.rss}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Uptime</span>
                        <span className="font-mono text-violet-400 font-bold">{health.system?.uptime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-4 pt-2 border-t border-white/5">
                    Live Node.js process consumption
                  </div>
                </div>

                {/* Redis Broker */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Server className="w-4 h-4 text-violet-400" />
                      Redis Message Broker
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-400">Host</span>
                        <span className="font-mono text-white">{health.redis?.host || "localhost"}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-400">Port</span>
                        <span className="font-mono text-white">{health.redis?.port || 6379}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status</span>
                        <span className="text-emerald-400 font-semibold uppercase text-xs flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          {health.redis?.status || "Connected"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-4 pt-2 border-t border-white/5">
                    BullMQ orchestration state
                  </div>
                </div>

                {/* Database Metrics */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-xs font-bold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Database className="w-4 h-4 text-amber-400" />
                      PostgreSQL Persistence
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-400">Total Reels Saved</span>
                        <span className="font-mono text-white font-bold">{health.database?.reels}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-slate-400">Performance Metrics</span>
                        <span className="font-mono text-white font-bold">{health.database?.metrics}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Rule Settings</span>
                        <span className="font-mono text-white font-bold">{health.database?.settings}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 italic mt-4 pt-2 border-t border-white/5">
                    Prisma ORM database counts
                  </div>
                </div>
              </div>

              {/* Queue Health Table */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Multi-Queue Orchestration Status
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 font-semibold pb-2">
                        <th className="pb-3 text-left pl-2">Queue Name</th>
                        <th className="pb-3 text-right">Waiting</th>
                        <th className="pb-3 text-right">Active</th>
                        <th className="pb-3 text-right">Completed</th>
                        <th className="pb-3 text-right">Failed</th>
                        <th className="pb-3 text-right pr-2">Health Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {Object.entries(health.queues || {}).map(([queueName, qData]: [string, any]) => {
                        const hasFailed = qData.failed > 0;
                        return (
                          <tr key={queueName} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 text-white font-semibold pl-2 font-mono">{queueName}</td>
                            <td className="py-3 text-right font-mono text-slate-300">{qData.waiting}</td>
                            <td className="py-3 text-right font-mono text-cyan-400">
                              {qData.active > 0 ? (
                                <span className="inline-flex items-center gap-1 font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                  {qData.active}
                                </span>
                              ) : (
                                "0"
                              )}
                            </td>
                            <td className="py-3 text-right font-mono text-emerald-400">{qData.completed}</td>
                            <td className={`py-3 text-right font-mono font-bold ${hasFailed ? 'text-red-400' : 'text-slate-500'}`}>{qData.failed}</td>
                            <td className="py-3 text-right pr-2">
                              {hasFailed ? (
                                <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded">
                                  Error Flagged
                                </span>
                              ) : (
                                <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded">
                                  Optimal
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Workers Status Section */}
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-violet-400" />
                  Active Worker Stream Grid
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {Object.entries(health.workers || {}).map(([workerName, wData]: [string, any]) => {
                    const statusColor = 
                      wData.status === "processing" ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : 
                      wData.status === "idle" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : 
                      "text-red-400 bg-red-500/10 border-red-500/20";
                    
                    return (
                      <div key={workerName} className="p-4 rounded-xl bg-slate-900/30 border border-white/5 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="font-semibold text-white font-mono text-sm">{workerName}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Last active: {new Date(wData.lastActive).toLocaleTimeString()}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded border ${statusColor}`}>
                            {wData.status}
                          </span>
                        </div>
                        {wData.lastError && (
                          <div className="mt-2 text-[10px] font-mono text-red-400 bg-red-950/20 border border-red-500/15 p-2.5 rounded">
                            <span className="font-bold block uppercase mb-0.5">Last Error:</span>
                            {wData.lastError}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 text-center text-slate-400 font-light rounded-2xl">
              System health stats loading...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
