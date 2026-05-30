import Link from "next/link";
import { 
  Sparkles, 
  TrendingUp, 
  Play, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  Share2, 
  Layers, 
  BarChart3, 
  Check, 
  Users,
  Music,
  Video
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#050816] text-white overflow-hidden">
      {/* Decorative Radial Backgrounds */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08)_0%,transparent_65%)] pointer-events-none z-0" />
      <div className="absolute top-[800px] right-0 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.03)_0%,transparent_60%)] pointer-events-none z-0" />
      
      {/* 1. HERO SECTION */}
      <section className="relative z-10 pt-24 pb-16 px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold tracking-wider uppercase text-slate-300 mb-8 animate-pulse-slow">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>V1.0 Autonomous Reels Agent Running</span>
        </div>

        {/* Hero Title */}
        <h1 className="font-['Space_Grotesk'] text-5xl md:text-8xl font-bold tracking-tight text-white mb-8 leading-[1.05] max-w-4xl">
          Own the algorithm <br />
          <span className="text-gradient font-extrabold">on pure autopilot.</span>
        </h1>

        {/* Hero Subheadline */}
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed font-light">
          A premium creator engine that automatically generates scripts, renders high-retention vertical Reels, synthesizes voiceovers, and auto-posts daily to maximize organic reach.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-24 z-20">
          <Link
            href="/dashboard"
            className="px-8 py-4 rounded-xl font-semibold bg-white text-[#050816] hover:bg-slate-200 transition text-center shadow-lg hover:shadow-white/10"
          >
            Access Creator Dashboard
          </Link>
          <Link
            href="/library"
            className="px-8 py-4 rounded-xl font-semibold bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08] transition text-center"
          >
            View Reel Library
          </Link>
        </div>

        {/* Hero Dashboard Preview Mockup */}
        <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0f172a]/30 backdrop-blur-xl p-4 shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent z-10 rounded-2xl pointer-events-none" />
          
          {/* Mock Window Header */}
          <div className="flex justify-between items-center pb-4 border-b border-white/[0.06] mb-4">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-white/10" />
              <span className="w-3 h-3 rounded-full bg-white/10" />
              <span className="w-3 h-3 rounded-full bg-white/10" />
            </div>
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">autonomous_system_dashboard.log</div>
            <div className="w-12 h-2 bg-white/5 rounded" />
          </div>

          {/* Grid Layout inside mockup */}
          <div className="grid md:grid-cols-3 gap-4 text-left">
            {/* Metric 1 */}
            <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Weekly Views Target</span>
              <div className="text-2xl font-bold font-['Space_Grotesk'] text-white">42,910</div>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-violet-400 to-white h-full w-[85%]" />
              </div>
              <span className="text-[9px] text-slate-500 mt-2 block">1.15x exponential day-over-day target</span>
            </div>

            {/* Metric 2 */}
            <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">AI Optimization Loop</span>
              <div className="text-2xl font-bold font-['Space_Grotesk'] text-violet-400">Aggressive Hook</div>
              <div className="flex gap-1 items-center mt-3 text-[9px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
                <span>Pexels & Elevenlabs API: Connected</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-xl">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Next Post Schedule</span>
              <div className="text-2xl font-bold font-['Space_Grotesk'] text-white">18:00 UTC</div>
              <span className="text-[9px] text-cyan-400 mt-3 block">Category: Business / Finance</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. AUTOMATION WORKFLOW SECTION */}
      <section className="relative z-10 py-24 px-6 max-w-5xl mx-auto border-t border-white/[0.06]">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-400">Automated Pipeline</span>
          <h2 className="font-['Space_Grotesk'] text-3xl md:text-5xl font-bold text-white mt-3">Four steps to absolute autonomy.</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mt-4 font-light">How the creator engine updates daily, makes decisions, renders videos, and interacts with APIs.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 relative">
          {/* Step 1 */}
          <div className="glass-panel p-6 rounded-2xl relative flex flex-col justify-between h-60">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">1. Prompt Scripts</h3>
              <p className="text-slate-400 text-xs font-light leading-relaxed">
                Gemini 2.5 drafts viral scripts, customizing psychological hooks if weekly views dip below growth targets.
              </p>
            </div>
            <span className="text-slate-600 font-mono text-[10px]">01 / GENERATE</span>
          </div>

          {/* Step 2 */}
          <div className="glass-panel p-6 rounded-2xl relative flex flex-col justify-between h-60">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                <Music className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">2. Voice Synthesis</h3>
              <p className="text-slate-400 text-xs font-light leading-relaxed">
                ElevenLabs TTS synthesizes human-grade voice narration, ensuring high audio-retention rates.
              </p>
            </div>
            <span className="text-slate-600 font-mono text-[10px]">02 / AUDIO</span>
          </div>

          {/* Step 3 */}
          <div className="glass-panel p-6 rounded-2xl relative flex flex-col justify-between h-60">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                <Video className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">3. FFmpeg Render</h3>
              <p className="text-slate-400 text-xs font-light leading-relaxed">
                Pexels searches background footage. Locally compiled FFmpeg binds audio, music, and background clip into a Reel.
              </p>
            </div>
            <span className="text-slate-600 font-mono text-[10px]">03 / COMPILATION</span>
          </div>

          {/* Step 4 */}
          <div className="glass-panel p-6 rounded-2xl relative flex flex-col justify-between h-60">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                <Share2 className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">4. Auto Publish</h3>
              <p className="text-slate-400 text-xs font-light leading-relaxed">
                Instagram Graph API publishes the output. Live views & likes are analyzed to self-optimize caption and tags.
              </p>
            </div>
            <span className="text-slate-600 font-mono text-[10px]">04 / DEPLOY</span>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES GRID SECTION */}
      <section className="relative z-10 py-24 px-6 max-w-5xl mx-auto border-t border-white/[0.06]">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-400">Robust Features</span>
          <h2 className="font-['Space_Grotesk'] text-3xl md:text-5xl font-bold text-white mt-3">Built for continuous reach.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-panel glass-card-hover p-8 rounded-2xl">
            <Layers className="w-8 h-8 text-violet-400 mb-6" />
            <h3 className="font-semibold text-lg text-white mb-2">Multi-Category Scheduler</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-light">
              Toggle automated uploads for Tech News, Business Hacks, and Motivation quotes. The system maintains consistency 24/7.
            </p>
          </div>

          <div className="glass-panel glass-card-hover p-8 rounded-2xl">
            <Zap className="w-8 h-8 text-violet-400 mb-6" />
            <h3 className="font-semibold text-lg text-white mb-2">Exponential Growth Logic</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-light">
              Increases view expectations by 1.15x day-over-day. When thresholds fail, the generator pivots script strategies immediately.
            </p>
          </div>

          <div className="glass-panel glass-card-hover p-8 rounded-2xl">
            <BarChart3 className="w-8 h-8 text-violet-400 mb-6" />
            <h3 className="font-semibold text-lg text-white mb-2">Insights Dashboard</h3>
            <p className="text-slate-400 text-xs leading-relaxed font-light">
              Sync engagement rates directly from Instagram. Keep track of views, likes, comment statistics, and active hooks cleanly.
            </p>
          </div>
        </div>
      </section>

      {/* 4. TESTIMONIALS SECTION */}
      <section className="relative z-10 py-24 px-6 max-w-5xl mx-auto border-t border-white/[0.06]">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-400">Case Studies</span>
          <h2 className="font-['Space_Grotesk'] text-3xl md:text-5xl font-bold text-white mt-3">Creator results on autopilot.</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between">
            <p className="text-slate-300 text-sm italic font-light leading-relaxed mb-6">
              "We managed to scale our new tech channel to 100K views in less than 3 weeks using AI Signal. The autonomous script adjustment is absolutely genius when engagement dips."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center font-bold text-xs text-white">
                JD
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Julian Davenport</div>
                <div className="text-[10px] text-slate-500">Tech Daily Channel</div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between">
            <p className="text-slate-300 text-sm italic font-light leading-relaxed mb-6">
              "Not having to think about video compilation, music mixing, or API endpoints has given me back 15 hours a week. The auto-generated caption formatting is perfect."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center font-bold text-xs text-white">
                SM
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Sophia Martinez</div>
                <div className="text-[10px] text-slate-500">Digital Hustle Brand</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRICING CARDS */}
      <section className="relative z-10 py-24 px-6 max-w-5xl mx-auto border-t border-white/[0.06]">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-400">Pricing</span>
          <h2 className="font-['Space_Grotesk'] text-3xl md:text-5xl font-bold text-white mt-3">Simple pricing. High return.</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold tracking-wider block mb-2">Starter</span>
              <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-4">$29<span className="text-xs font-light text-slate-500">/mo</span></div>
              <p className="text-slate-400 text-xs mb-6 font-light">Ideal for single channels testing automated short-form video generation.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> 1 Instagram Business Account</li>
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> 1 Daily Reel Generated</li>
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> Standard Gemini Hook Templates</li>
              </ul>
            </div>
            <Link href="/dashboard" className="w-full py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-center text-xs font-semibold">
              Get Started
            </Link>
          </div>

          {/* Pro */}
          <div className="glass-panel p-8 rounded-2xl border-violet-500/30 bg-gradient-to-br from-violet-500/[0.03] to-transparent flex flex-col justify-between relative">
            <span className="absolute top-4 right-4 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full">Popular</span>
            <div>
              <span className="text-xs text-violet-400 font-semibold tracking-wider block mb-2">Professional</span>
              <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-4">$79<span className="text-xs font-light text-slate-500">/mo</span></div>
              <p className="text-slate-400 text-xs mb-6 font-light">Perfect for creators running multiple channels and aiming for steady scaling.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> Up to 3 Connected Accounts</li>
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> 3 Daily Reels Generated</li>
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> Closed-Loop Algorithm Tuning</li>
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> Advanced Hook Generation</li>
              </ul>
            </div>
            <Link href="/dashboard" className="w-full py-3 rounded-lg bg-white text-[#050816] hover:bg-slate-200 transition text-center text-xs font-semibold">
              Scale Now
            </Link>
          </div>

          {/* Enterprise */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-xs text-slate-400 font-semibold tracking-wider block mb-2">Agency</span>
              <div className="text-3xl font-bold font-['Space_Grotesk'] text-white mb-4">$199<span className="text-xs font-light text-slate-500">/mo</span></div>
              <p className="text-slate-400 text-xs mb-6 font-light">For marketing agencies looking to automate short-form content at scale.</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> Unlimited Accounts</li>
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> Custom Daily Reel Frequency</li>
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> Dedicated API Key Integrations</li>
                <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-4 h-4 text-violet-400" /> Priority Server Rendering</li>
              </ul>
            </div>
            <Link href="/dashboard" className="w-full py-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition text-center text-xs font-semibold">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-[#050816] py-16 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
              <span className="font-['Space_Grotesk'] font-bold text-white tracking-tight">AI Signal</span>
            </div>
            <p className="text-slate-500 text-xs font-light max-w-xs leading-relaxed">
              Autonomous creator engine for daily vertical video rendering, insights collection, and organic algorithm growth.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-3">Product</span>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><Link href="/dashboard" className="hover:text-white transition">Dashboard</Link></li>
                <li><Link href="/analytics" className="hover:text-white transition">Analytics</Link></li>
                <li><Link href="/library" className="hover:text-white transition">Library</Link></li>
              </ul>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-3">System</span>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><Link href="/settings" className="hover:text-white transition">Settings</Link></li>
                <li><Link href="/admin" className="hover:text-white transition">Admin Panel</Link></li>
              </ul>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-3">Legal</span>
              <ul className="space-y-2 text-xs text-slate-500">
                <li><span className="cursor-not-allowed">Terms</span></li>
                <li><span className="cursor-not-allowed">Privacy</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-12 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between text-[11px] text-slate-600 font-light">
          <span>&copy; 2026 AI Signal Platform. All rights reserved.</span>
          <span>Designed with minimal luxury. Built for builders.</span>
        </div>
      </footer>
    </div>
  );
}
