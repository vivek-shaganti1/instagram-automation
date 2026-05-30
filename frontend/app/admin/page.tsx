"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Terminal, Trash2, ShieldCheck } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([
    "2026-05-28 23:20:00 [INFO] scheduler - Starting morning AI Reel generation",
    "2026-05-28 23:20:02 [INFO] gemini - Generating script topic: 3 AI Tools Students Must Use",
    "2026-05-28 23:20:05 [INFO] elevenlabs - Speech synthesis completed. Voice ID: Rachel",
    "2026-05-28 23:20:12 [INFO] ffmpeg - Overlaying audio and mixing song.mp3 background track",
    "2026-05-28 23:20:18 [INFO] ffmpeg - Vertical 9:16 MP4 Reel compiled successfully",
    "2026-05-28 23:20:19 [INFO] instagram - Initialized Graph API Reels container upload",
    "2026-05-28 23:20:45 [INFO] instagram - Media publish verified successfully. Post ID: 3906771",
    "2026-05-28 23:20:46 [INFO] analytics - views: 180, likes: 24, comments: 2",
    "2026-05-28 23:20:47 [INFO] main - Automation run completed successfully."
  ]);
  
  const [schedulerActive, setSchedulerActive] = useState(true);

  useEffect(() => {
    const cachedUser = localStorage.getItem("user");
    if (!cachedUser) {
      router.push("/login");
    }
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const toggleScheduler = () => {
    setSchedulerActive(!schedulerActive);
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-['Space_Grotesk'] text-3xl font-extrabold text-white flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-violet-500" />
          <span>System Administration</span>
        </h1>
        <p className="text-slate-400 text-sm font-light">Monitor background queue workers, cron schedulers, and inspect system log outputs.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Scheduler Controls */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-1 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-white mb-2">Cron Scheduler</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-light mb-6">Controls whether automatic daily schedules (8 AM, 2 PM, 8 PM) are allowed to execute.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300 bg-white/5 p-3 rounded-lg border border-white/5">
              <span>Status:</span>
              <span className={schedulerActive ? "text-green-400" : "text-amber-500"}>
                {schedulerActive ? "RUNNING" : "PAUSED"}
              </span>
            </div>
            <button 
              onClick={toggleScheduler}
              className={`w-full py-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition ${schedulerActive ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-750"}`}
            >
              {schedulerActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Cron Scheduler</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Cron Scheduler</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Worker Status */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-1 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-white mb-2">Redis BullMQ Worker</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-light mb-6">Monitors background processing nodes handling script compiling and rendering queues.</p>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>Active Threads:</span>
              <span className="text-white font-bold">1</span>
            </div>
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>Queue Status:</span>
              <span className="text-green-400 font-bold">IDLE</span>
            </div>
          </div>
        </div>

        {/* Cloud Credits */}
        <div className="glass-panel p-6 rounded-2xl md:col-span-1 flex flex-col justify-between">
          <div>
            <h4 className="font-semibold text-white mb-2">SaaS API Allocations</h4>
            <p className="text-slate-400 text-xs leading-relaxed font-light mb-6">Approximate credit availability for external integrations.</p>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>ElevenLabs characters:</span>
              <span className="text-cyan-400 font-bold">84,200 remaining</span>
            </div>
            <div className="flex justify-between p-2 bg-white/5 rounded border border-white/5">
              <span>Pexels video hits:</span>
              <span className="text-cyan-400 font-bold">120/hour</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Log Console */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-slate-900/30 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
            <Terminal className="w-4 h-4 text-violet-400" />
            <span>Real-time Log Console</span>
          </div>
          <button 
            onClick={clearLogs}
            className="text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
        
        <div className="p-5 bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-400 overflow-y-auto max-h-[300px] space-y-1">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">No logs collected.</div>
          ) : (
            logs.map((log, index) => {
              let color = "text-slate-400";
              if (log.includes("[ERROR]")) color = "text-red-400";
              if (log.includes("[WARNING]")) color = "text-amber-400";
              if (log.includes("[INFO]")) color = "text-slate-300";
              
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
