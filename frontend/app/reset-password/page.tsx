"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Key, RotateCw, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { friendlyAuthError } from "@/utils/auth-errors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The recovery link (via /auth/callback) signs the user in temporarily;
  // without that session there is nothing to update.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user);
      setCheckingSession(false);
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(friendlyAuthError(error));
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1500);
    } catch (err) {
      setErrorMsg(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(168,85,247,0.06)_0%,transparent_50%)] pointer-events-none" />

      <div className="glass-panel p-8 rounded-2xl w-full max-w-md relative z-10 border border-white/[0.08]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold tracking-widest uppercase text-violet-400 mb-4">
            <Sparkles className="w-3 h-3" />
            <span>New Password</span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white mb-2">Choose a new password</h2>
        </div>

        {checkingSession ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            <RotateCw className="w-6 h-6 animate-spin mx-auto mb-3 text-violet-500" />
            Verifying reset link...
          </div>
        ) : !hasSession ? (
          <div className="text-center py-4">
            <p className="text-slate-300 text-xs mb-6 leading-relaxed">
              This reset link is invalid or has expired. Request a new one to continue.
            </p>
            <Link href="/forgot-password" className="px-6 py-2.5 bg-white text-[#050816] rounded-lg text-xs font-bold transition hover:bg-slate-200">
              Request new link
            </Link>
          </div>
        ) : done ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h4 className="font-semibold text-white text-sm mb-2">Password updated</h4>
            <p className="text-slate-300 text-xs">Taking you to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">New Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-slate-300 text-sm focus:border-violet-500/50 outline-none transition"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Confirm Password</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-slate-300 text-sm focus:border-violet-500/50 outline-none transition"
                  placeholder="Repeat password"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl font-semibold bg-white text-[#050816] hover:bg-slate-200 transition text-xs flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
