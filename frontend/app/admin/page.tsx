"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, ShieldCheck, RotateCw, Server, Database, Activity } from "lucide-react";
import { getApiUrl } from "@/utils/api";

type Health = {
  status: string;
  timestamp: string;
  workerDeployed?: boolean;
  redis?: { host: string; port: number; status: string };
  queues?: Record<string, { waiting: number; active: number; failed: number; completed: number; status?: string }>;
  workers?: Record<string, { status: string; lastActive?: string; lastError?: string }>;
  database?: { status: string; reels: number; metrics: number; settings: number };
  system?: { memory: { heapUsed: string; heapTotal: string; rss: string }; uptime: string } | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      try {
        const res = await fetch(getApiUrl("/api/health"));
        if (res.status === 401) {
          router.push("/login?next=/admin");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.details ? `${data.error} — ${data.details}` : (data.error || "Failed to load health"));
        if (!mounted) return;
        setHealth(data);
        setError(null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load system health");
      } finally {
        if (mounted) {
          setLoading(false);
          setLastChecked(new Date());
          timer = setTimeout(load, 15000);
        }
      }
    };
    load();

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [router]);

  // Build a log-style event list from the real health snapshot.
  const logLines: string[] = [];
  if (health) {
    const ts = new Date(health.timestamp).toISOString().replace("T", " ").slice(0, 19);
    logLines.push(`${ts} [INFO] health - overall status: ${health.status.toUpperCase()}`);
    logLines.push(
      `${ts} [${health.database?.status === "connected" ? "INFO" : "ERROR"}] database - ${health.database?.status} (reels=${health.database?.reels ?? 0}, metrics=${health.database?.metrics ?? 0}, settings=${health.database?.settings ?? 0})`
    );
    if (health.workerDeployed === false) {
      logLines.push(`${ts} [WARNING] worker - automation worker not deployed; queues and scheduler unavailable`);
    } else {
      logLines.push(`${ts} [${health.redis?.status === "connected" ? "INFO" : "ERROR"}] redis - ${health.redis?.status} at ${health.redis?.host}:${health.redis?.port}`);
      for (const [name, q] of Object.entries(health.queues || {})) {
        const lvl = q.status === "offline" ? "ERROR" : q.failed > 0 ? "WARNING" : "INFO";
        logLines.push(`${ts} [${lvl}] queue:${name} - waiting=${q.waiting} active=${q.active} completed=${q.completed} failed=${q.failed}`);
      }
      for (const [name, w] of Object.entries(health.workers || {})) {
        const lvl = w.lastError ? "ERROR" : "INFO";
        logLines.push(`${ts} [${lvl}] worker:${name} - ${w.status}${w.lastError ? ` (${w.lastError})` : ""}`);
      }
      if (health.system) {
        logLines.push(`${ts} [INFO] system - uptime ${health.system.uptime}, heap ${health.system.memory.heapUsed}/${health.system.memory.heapTotal}`);
      }
    }
  }

  const workerUp = !!health && health.workerDeployed !== false && health.redis?.status === "connected";
  const queueEntries = Object.entries(health?.queues || {});
  const activeJobs = queueEntries.reduce((s, [, q]) => s + (q.active || 0), 0);
  const waitingJobs = queueEntries.reduce((s, [, q]) => s + (q.waiting || 0), 0);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-light">
        <RotateCw className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
        <span>Loading system status...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-['Space_Grotesk'] text-3xl font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-violet-500" />
            <span>System Administration</span>
          </h1>
          <p className="text-slate-400 text-sm font-light">Live status of the database, background worker, and job queues.</p>
        </div>
        {lastChecked && (
          <span className="text-[11px] text-slate-500 font-mono">Last checked {lastChecked.toLocaleTimeString()} · refreshes every 15s</span>
        )}
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-950/50 border border-red-500/50 rounded-xl text-center text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Database */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2"><Database className="w-4 h-4 text-amber-400" /> Database</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-light mb-6">Supabase Postgres holding reels, metrics and settings.</p>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>Status:</span>
              <span className={`font-bold uppercase ${health?.database?.status === "connected" ? "text-green-400" : "text-red-400"}`}>
                {health?.database?.status ?? "unknown"}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>Reels / Metrics / Settings:</span>
              <span className="text-white font-bold font-mono">
                {health?.database?.reels ?? 0} / {health?.database?.metrics ?? 0} / {health?.database?.settings ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Worker */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2"><Server className="w-4 h-4 text-cyan-400" /> Automation Worker</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-light mb-6">Express + BullMQ process that generates, renders and publishes Reels.</p>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>Status:</span>
              <span className={`font-bold uppercase ${workerUp ? "text-green-400" : "text-amber-500"}`}>
                {health?.workerDeployed === false ? "NOT DEPLOYED" : workerUp ? "ONLINE" : "DEGRADED"}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>Redis:</span>
              <span className={`font-bold uppercase ${health?.redis?.status === "connected" ? "text-green-400" : "text-slate-500"}`}>
                {health?.workerDeployed === false ? "n/a" : health?.redis?.status ?? "unknown"}
              </span>
            </div>
          </div>
        </div>

        {/* Queues */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> Job Queues</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-light mb-6">Research → strategy → generation → render → upload pipeline.</p>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>Queues:</span>
              <span className="text-white font-bold">{queueEntries.length}</span>
            </div>
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>Active / Waiting:</span>
              <span className="text-white font-bold font-mono">{activeJobs} / {waitingJobs}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Log Console */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-slate-900/30 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
            <Terminal className="w-4 h-4 text-violet-400" />
            <span>Health Snapshot</span>
          </div>
        </div>

        <div className="p-5 bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-400 overflow-y-auto max-h-[300px] space-y-1">
          {logLines.length === 0 ? (
            <div className="text-slate-600 italic">No health data available.</div>
          ) : (
            logLines.map((log, index) => {
              let color = "text-slate-300";
              if (log.includes("[ERROR]")) color = "text-red-400";
              if (log.includes("[WARNING]")) color = "text-amber-400";
              return (
                <div key={index} className={`${color} whitespace-pre-wrap`}>
                  {log}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
