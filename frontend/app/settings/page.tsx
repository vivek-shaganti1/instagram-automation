"use client";

import { useState, useEffect } from "react";
import { Save, Shield, Key, Sliders, CheckCircle, RotateCw } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [credentials, setCredentials] = useState({
    igUsername: "",
    igPassword: "",
    igHandle: "",
    geminiKey: "",
    elevenLabsKey: "",
    pexelsKey: "",
    targetBaseline: "100",
    growthMultiplier: "15%"
  });

  // Fetch settings from database on mount
  useEffect(() => {
    fetch("http://localhost:8000/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then((data) => {
        setCredentials({
          igUsername: data.igUsername || "",
          igPassword: data.igPassword || "",
          igHandle: data.igHandle || "",
          geminiKey: data.geminiKey || "",
          elevenLabsKey: data.elevenLabsKey || "",
          pexelsKey: data.pexelsKey || "",
          targetBaseline: data.targetBaseline || "100",
          growthMultiplier: data.growthMultiplier || "15%"
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMessage("Could not load settings from database.");
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await fetch("http://localhost:8000/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage(data.error || "Failed to update configurations.");
      }
    } catch (err) {
      setErrorMessage("Network error: Could not connect to backend server.");
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-light">
        <RotateCw className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
        <span>Loading Platform Configurations...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-['Space_Grotesk'] text-3xl font-extrabold text-white">Platform Settings</h1>
        <p className="text-slate-400 text-sm font-light">Manage your API integrations, credentials, and strategy rules.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">
            {errorMessage}
          </div>
        )}

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
                placeholder="Paste Gemini API Key"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">ElevenLabs Voice API Key</label>
              <input 
                type="password" 
                value={credentials.elevenLabsKey}
                onChange={(e) => setCredentials({ ...credentials, elevenLabsKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-violet-500/50 outline-none"
                placeholder="Paste ElevenLabs Key"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-2">Pexels Stock API Key</label>
              <input 
                type="password" 
                value={credentials.pexelsKey}
                onChange={(e) => setCredentials({ ...credentials, pexelsKey: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-violet-500/50 outline-none"
                placeholder="Paste Pexels API Key"
              />
            </div>
          </div>
        </div>

        {/* Instagram Account */}
        <div className="glass-panel p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-white text-lg">Instagram Credentials</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Username</label>
              <input 
                type="text" 
                value={credentials.igUsername}
                onChange={(e) => setCredentials({ ...credentials, igUsername: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-cyan-500/50 outline-none"
                placeholder="e.g. ai_signal_09"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">Password</label>
              <input 
                type="password" 
                value={credentials.igPassword}
                onChange={(e) => setCredentials({ ...credentials, igPassword: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-cyan-500/50 outline-none"
                placeholder="Enter Instagram password"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-2">Profile Handle Display (optional)</label>
              <input 
                type="text" 
                value={credentials.igHandle}
                onChange={(e) => setCredentials({ ...credentials, igHandle: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-slate-300 text-sm focus:border-cyan-500/50 outline-none"
                placeholder="e.g. @ai_signal_09"
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
              <span>Configurations saved to database!</span>
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
