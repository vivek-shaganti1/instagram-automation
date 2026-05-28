import Link from "next/link";
import { Sparkles, TrendingUp, Play, ShieldAlert, Cpu } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="py-20 px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-400 mb-8 animate-pulse-slow">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Fully Autonomous Creator Engine Deployed</span>
      </div>

      {/* Hero Headline */}
      <h1 className="font-['Space_Grotesk'] text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
        Own the Instagram Algorithm <br />
        <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent">
          On Pure Autopilot
        </span>
      </h1>

      {/* Hero Subheadline */}
      <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed font-light">
        A premium SaaS platform that automatically generates scripts, renders high-retention vertical Reels, schedules, posts, and refines hooks using a closed-loop AI viral optimizer.
      </p>

      {/* Hero Call to Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-16 relative z-20">
        <Link
          href="/dashboard"
          className="px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-violet-600 text-white glow-btn text-center"
        >
          Access Creator Dashboard
        </Link>
        <Link
          href="/library"
          className="px-8 py-4 rounded-xl font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition text-center"
        >
          View Reel History
        </Link>
      </div>

      {/* Key Feature Showcase */}
      <div className="grid md:grid-cols-3 gap-6 w-full text-left mt-10">
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-cyan-500/30 transition">
          <Cpu className="w-10 h-10 text-cyan-400 mb-4" />
          <h3 className="font-semibold text-lg text-white mb-2">3 Daily Reels</h3>
          <p className="text-slate-400 text-sm leading-relaxed font-light">
            Automatically schedules and uploads AI technology news, Business/Money side hustles, and retention-focused Motivation incidents every single day.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-violet-500/30 transition">
          <TrendingUp className="w-10 h-10 text-violet-400 mb-4" />
          <h3 className="font-semibold text-lg text-white mb-2">Exponential 1.15x Growth</h3>
          <p className="text-slate-400 text-sm leading-relaxed font-light">
            Targets 100+ views daily, increasing target thresholds exponentially. Adapts content hooks automatically if thresholds are missed.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group hover:border-amber-500/30 transition">
          <ShieldAlert className="w-10 h-10 text-amber-400 mb-4" />
          <h3 className="font-semibold text-lg text-white mb-2">Closed-Loop Optimization</h3>
          <p className="text-slate-400 text-sm leading-relaxed font-light">
            Syncs actual views and likes from the Instagram Graph API. The system self-optimizes pacing, visual prompts, captions, and uploading triggers.
          </p>
        </div>
      </div>
    </div>
  );
}
