"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Shield, Mail, Key, RotateCw } from "lucide-react";
import { getApiUrl } from "../../utils/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else {
        setErrorMsg(data.error || "Invalid credentials. Please try again.");
      }
    } catch (err) {
      setErrorMsg("Network error: Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(168,85,247,0.06)_0%,transparent_50%)] pointer-events-none" />
      
      <div className="glass-panel p-8 rounded-2xl w-full max-w-md relative z-10 border border-white/[0.08]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold tracking-widest uppercase text-violet-400 mb-4">
            <Sparkles className="w-3 h-3" />
            <span>Secure Access</span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-slate-400 text-xs font-light">Log in to manage your automated Reels agent.</p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-slate-300 text-sm focus:border-violet-500/50 outline-none transition"
                placeholder="you@domain.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Password</label>
              <Link href="/forgot-password" className="text-[10px] text-violet-400 hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-slate-300 text-sm focus:border-violet-500/50 outline-none transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-xl font-semibold bg-white text-[#050816] hover:bg-slate-200 transition text-xs flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/[0.04] text-center text-xs text-slate-400 font-light">
          Don't have an account?{" "}
          <Link href="/signup" className="text-violet-400 hover:underline font-semibold">Sign up free</Link>
        </div>
      </div>
    </div>
  );
}
