"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";


export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Check your email for the confirmation link.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <form onSubmit={handleSignup} className="p-8 bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm border border-slate-800">
        <h1 className="text-2xl font-bold mb-6 text-white text-center">Sign Up</h1>
        {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}
        {message && <div className="mb-4 text-emerald-400 text-sm text-center">{message}</div>}
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
          Sign Up
        </button>
        <div className="mt-4 text-center">
          <span className="text-slate-400 text-sm">Already have an account? </span>
          <button type="button" onClick={() => router.push('/login')} className="text-violet-400 hover:underline text-sm">Sign In</button>
        </div>
      </form>
    </div>
  );
}
