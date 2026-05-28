"use client";

import { useEffect, useState } from "react";
import { RotateCw, CheckCircle2, AlertTriangle, Eye, Video } from "lucide-react";

export default function LibraryPage() {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/stats")
      .then(res => res.json())
      .then(data => {
        setReels(data.posts || []);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-light">
        <RotateCw className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-500" />
        <span>Loading Reels Library...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-['Space_Grotesk'] text-3xl font-extrabold text-white">Content Library</h1>
        <p className="text-slate-400 text-sm font-light">Browse, review, and preview your generated and published Reels.</p>
      </div>

      {reels.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 font-light rounded-2xl">
          No content generated yet. Open the Dashboard to trigger your first run.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reels.map((reel) => {
            const date = new Date(reel.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric"
            });

            return (
              <div key={reel.id} className="glass-panel rounded-2xl overflow-hidden flex flex-col h-[380px]">
                {/* Visual Preview Box */}
                <div className="h-44 bg-slate-950 flex flex-col items-center justify-center relative group border-b border-white/5">
                  <Video className="w-12 h-12 text-slate-700 group-hover:text-cyan-400 transition" />
                  <span className="text-slate-500 text-[10px] mt-2 font-mono uppercase tracking-wider">
                    {reel.status === "UPLOADED" ? "Ready for Preview" : "Rendering in Progress"}
                  </span>
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    {reel.status === "UPLOADED" ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                    )}
                    <span>{reel.status}</span>
                  </div>
                </div>

                {/* Info and stats */}
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>{date}</span>
                      <span className="uppercase font-semibold tracking-wider text-violet-400">{reel.category}</span>
                    </div>
                    <h4 className="font-semibold text-white mb-2 line-clamp-1">{reel.headline}</h4>
                    <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed font-light">{reel.caption}</p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/5 text-xs text-slate-300 font-semibold mt-4">
                    <div className="flex gap-3">
                      <span>Views: <strong className="text-white">{reel.views.toLocaleString()}</strong></span>
                      <span>Likes: <strong className="text-white">{reel.likes.toLocaleString()}</strong></span>
                    </div>
                    
                    {reel.videoUrl && (
                      <a 
                        href={reel.videoUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Watch</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
