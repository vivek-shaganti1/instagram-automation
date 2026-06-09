"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Key, RotateCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message || "Failed to create account.");
      } else {
        // If email confirmation is enabled, data.user will be returned but session will be null
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setErrorMsg("This email is already registered. Please sign in.");
        } else if (data.session) {
          localStorage.setItem("user", JSON.stringify({ email: data.user?.email }));
          router.push("/dashboard");
        } else {
          setSuccessMsg("Account created! Please check your email for a confirmation link.");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
        }
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
            <span>Create Account</span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white mb-2">Get Started</h2>
          <p className="text-slate-400 text-xs font-light">Set up your account to automate your content engine.</p>
        </div>

        {errorMsg && (
          <div className="p-3 mb-5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
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
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Password</label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-slate-300 text-sm focus:border-violet-500/50 outline-none transition"
                placeholder="Minimum 6 characters"
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-slate-300 text-sm focus:border-violet-500/50 outline-none transition"
                placeholder="Re-enter password"
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
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/[0.04] text-center text-xs text-slate-400 font-light">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-400 hover:underline font-semibold">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
