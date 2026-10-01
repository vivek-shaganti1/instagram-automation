"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { friendlyAuthError } from "@/utils/auth-errors";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      });
      if (error) {
        setError(friendlyAuthError(error));
        return;
      }
      // If email confirmation is disabled in Supabase, a session is returned immediately.
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setMessage("Account created! Check your email for the confirmation link to finish signing up.");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <form onSubmit={handleSignup} className="p-8 bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-800">
        <h1 className="text-2xl font-bold mb-6 text-white text-center">Sign Up</h1>
        {error && <div className="mb-4 text-red-400 text-sm text-center">{error}</div>}
        {message && <div className="mb-4 text-emerald-400 text-sm text-center">{message}</div>}
        <input
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-2 bg-slate-800 text-white rounded outline-none focus:ring-2 focus:ring-violet-500"
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-2 bg-slate-800 text-white rounded outline-none focus:ring-2 focus:ring-violet-500"
          required
        />
        <button
          type="submit"
          disabled={loading || !!message}
          className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2"
        >
          {loading && <RotateCw className="w-4 h-4 animate-spin" />}
          {loading ? "Creating account..." : "Sign Up"}
        </button>
        <div className="mt-4 text-center">
          <span className="text-slate-400 text-sm">Already have an account? </span>
          <Link href="/login" className="text-violet-400 hover:underline text-sm">Sign In</Link>
        </div>
      </form>
    </div>
  );
}
