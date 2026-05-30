import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Signal | Autonomous Reels Engine",
  description: "Fully automated daily Instagram Reels generator & insights dashboard on autopilot.",
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-[#050816] text-white flex flex-col">
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 w-full bg-[#050816]/70 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-violet-400 to-white shadow-[0_0_15px_rgba(168,85,247,0.7)]"></span>
            <Link href="/" className="font-['Space_Grotesk'] text-lg font-bold tracking-tight text-white hover:opacity-90 transition">
              AI Signal
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Link href="/dashboard" className="hover:text-white transition">Dashboard</Link>
            <Link href="/analytics" className="hover:text-white transition">Analytics</Link>
            <Link href="/library" className="hover:text-white transition">Library</Link>
            <Link href="/settings" className="hover:text-white transition">Settings</Link>
            <Link href="/admin" className="hover:text-white transition text-violet-400">Admin</Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="px-4 py-2 rounded-lg text-xs font-bold bg-white text-[#050816] hover:bg-slate-200 transition">
              Get Started
            </Link>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-grow relative z-10">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.05)_0%,transparent_50%)] pointer-events-none"></div>
          {children}
        </main>
      </body>
    </html>
  );
}
