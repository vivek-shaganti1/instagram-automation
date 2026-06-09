"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    localStorage.setItem("user", JSON.stringify({ email }));
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <form onSubmit={handleLogin} className="p-8 bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-800">
        <h1 className="text-2xl font-bold mb-6 text-white text-center">Sign In</h1>
        {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-2 bg-slate-800 text-white rounded outline-none focus:ring-2 focus:ring-violet-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-4 py-2 bg-slate-800 text-white rounded outline-none focus:ring-2 focus:ring-violet-500"
          required
        />
        <button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded">
          Sign In
        </button>
        <div className="mt-4 text-center">
          <span className="text-slate-400 text-sm">Don't have an account? </span>
          <button type="button" onClick={() => router.push('/signup')} className="text-violet-400 hover:underline text-sm">Sign Up</button>
        </div>
      </form>
    </div>
  );
}
