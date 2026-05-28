"use client";

import { useState } from "react";
import { Save, Shield, Key, Sliders, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [credentials, setCredentials] = useState({
    igUsername: "ai_signal_09",
    igHandle: "@ai_signal_09",
    geminiKey: "••••••••••••••••••••••••",
    elevenLabsKey: "••••••••••••••••••••••••",
    pexelsKey: "••••••••••••••••••••••••",
    targetBaseline: "100",
    growthMultiplier: "15%"
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-['Space_Grotesk'] text-3xl font-extrabold text-white">Platform Settings</h1>
        <p className="text-slate-400 text-sm font-light">Manage your API integrations, credentials, and strategy rules.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API Integrations */}
        <div className="glass-panel p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold text-white text-lg">API Integrations</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Google Gemini API Key</label>
              <input 
                type="password" 
                value={credentials.geminiKey}
                onChange={(e) => setCredentials({ ...credentials, geminiKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-violet-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">ElevenLabs Voice API Key</label>
              <input 
                type="password" 
                value={credentials.elevenLabsKey}
                onChange={(e) => setCredentials({ ...credentials, elevenLabsKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-violet-500/50 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-2">Pexels Stock API Key</label>
              <input 
                type="password" 
                value={credentials.pexelsKey}
                onChange={(e) => setCredentials({ ...credentials, pexelsKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-violet-500/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Instagram Account */}
        <div className="glass-panel p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-white text-lg">Instagram Account</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Username</label>
              <input 
                type="text" 
                value={credentials.igUsername}
                onChange={(e) => setCredentials({ ...credentials, igUsername: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-cyan-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Profile Handle</label>
              <input 
                type="text" 
                value={credentials.igHandle}
                onChange={(e) => setCredentials({ ...credentials, igHandle: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-cyan-500/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Growth Target Configurations */}
        <div className="glass-panel p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white text-lg">Target Analytics Settings</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Initial Views Target (Day 1)</label>
              <input 
                type="number" 
                value={credentials.targetBaseline}
                onChange={(e) => setCredentials({ ...credentials, targetBaseline: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-amber-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Daily Exponential Growth Rate</label>
              <input 
                type="text" 
                value={credentials.growthMultiplier}
                onChange={(e) => setCredentials({ ...credentials, growthMultiplier: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-amber-500/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4 items-center">
          {saveSuccess && (
            <span className="text-sm font-semibold text-green-400 flex items-center gap-1.5 animate-pulse-slow">
              <CheckCircle className="w-4 h-4" />
              <span>Configurations saved successfully!</span>
            </span>
          )}
          <button 
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-xl text-sm font-semibold text-white glow-btn flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Configurations</span>
          </button>
        </div>
      </form>
    </div>
  );
}
