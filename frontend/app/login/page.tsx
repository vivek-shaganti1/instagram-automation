"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { friendlyAuthError } from "@/utils/auth-errors";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error"));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(friendlyAuthError(error));
        return;
      }
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="p-8 bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-800">
      <h1 className="text-2xl font-bold mb-6 text-white text-center">Sign In</h1>
      {error && <div className="mb-4 text-red-400 text-sm text-center">{error}</div>}
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
        placeholder="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-2 px-4 py-2 bg-slate-800 text-white rounded outline-none focus:ring-2 focus:ring-violet-500"
        required
      />
      <div className="text-right mb-6">
        <Link href="/forgot-password" className="text-xs text-slate-400 hover:text-violet-400">
          Forgot password?
        </Link>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2"
      >
        {loading && <RotateCw className="w-4 h-4 animate-spin" />}
        {loading ? "Signing in..." : "Sign In"}
      </button>
      <div className="mt-4 text-center">
        <span className="text-slate-400 text-sm">Don&apos;t have an account? </span>
        <Link href="/signup" className="text-violet-400 hover:underline text-sm">Sign Up</Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
