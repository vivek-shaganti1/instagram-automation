"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useSignOut, useUser } from "@/utils/use-user";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Settings" },
  { href: "/admin", label: "Admin", accent: true },
];

export default function SiteHeader() {
  const { user, loading } = useUser();
  const signOut = useSignOut();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#050816]/70 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-400 to-white shadow-[0_0_15px_rgba(168,85,247,0.7)]"></span>
        <Link href="/" className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-white hover:opacity-90 transition">
          AI Signal
        </Link>
      </div>

      <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`hover:text-white transition ${item.accent ? "text-violet-400" : ""} ${active ? "text-white" : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        {loading ? (
          <span className="w-24 h-8 rounded-lg bg-white/5 animate-pulse" />
        ) : user ? (
          <>
            <span className="hidden sm:block text-xs text-slate-400 max-w-[180px] truncate" title={user.email ?? ""}>
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="px-3 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition">
              Sign In
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-[#050816] hover:bg-slate-200 transition">
              Get Started
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
