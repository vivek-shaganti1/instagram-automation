import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Signal Reels SaaS Platform",
  description: "Fully automated daily Instagram Reels generator & insights dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-height-screen flex flex-col">
        {/* Navigation Header */}
        <header className="glass-panel border-b border-white/5 sticky top-0 z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]"></span>
            <Link href="/" className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-white hover:opacity-90">
              AI Signal
            </Link>
          </div>
          
          <nav className="flex items-center gap-6 text-sm font-semibold text-slate-300">
            <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
            <Link href="/analytics" className="hover:text-white transition">Analytics</Link>
            <Link href="/library" className="hover:text-white transition">Library</Link>
            <Link href="/settings" className="hover:text-white transition">Settings</Link>
            <Link href="/admin" className="hover:text-white transition text-violet-400">Admin</Link>
          </nav>
        </header>

        {/* Content body */}
        <main className="flex-grow relative z-10">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_10%_20%,rgba(139,92,246,0.08)_0%,transparent_35%),radial-gradient(circle_at_80%_80%,rgba(6,182,212,0.08)_0%,transparent_35%)] pointer-events-none"></div>
          {children}
        </main>
      </body>
    </html>
  );
}
