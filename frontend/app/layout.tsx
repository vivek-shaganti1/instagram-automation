import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "./components/SiteHeader";

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
        <SiteHeader />

        {/* Content body */}
        <main className="flex-grow relative z-10">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.05)_0%,transparent_50%)] pointer-events-none"></div>
          {children}
        </main>
      </body>
    </html>
  );
}
