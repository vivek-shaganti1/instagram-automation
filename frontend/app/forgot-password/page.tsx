"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, RotateCw, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("http://localhost:8000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message);
      } else {
        setErrorMsg(data.error || "Failed to process password recovery.");
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
            <span>Reset Password</span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white mb-2">Recover Password</h2>
          <p className="text-slate-400 text-xs font-light">We will lookup your account and output your simulated recovery instructions.</p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {successMsg ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h4 className="font-semibold text-white text-sm mb-2">Simulated Reset Successful</h4>
            <p className="text-slate-300 text-xs mb-6 px-2 leading-relaxed">{successMsg}</p>
            <Link href="/login" className="px-6 py-2.5 bg-white text-[#050816] rounded-lg text-xs font-bold transition hover:bg-slate-200">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5">
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

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl font-semibold bg-white text-[#050816] hover:bg-slate-200 transition text-xs flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking Email...</span>
                </>
              ) : (
                <span>Request Recovery</span>
              )}
            </button>
          </form>
        )}

        {!successMsg && (
          <div className="mt-6 pt-6 border-t border-white/[0.04] text-center text-xs text-slate-400 font-light">
            Remembered your password?{" "}
            <Link href="/login" className="text-violet-400 hover:underline font-semibold">Sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
