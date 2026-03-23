"use client";

import { Play, ArrowRight } from "lucide-react";
import { useState } from "react";

export function VideoDemoSection() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="w-full py-24 relative overflow-hidden">
      {/* Background Enhancements */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="flex flex-col lg:flex-row items-center gap-16 w-full max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Text Content */}
        <div className="flex-1 space-y-8 z-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 rounded-full px-4 py-1.5 border border-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Lihat Alur</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold leading-tight text-white">
            Dari Foto Mentah ke <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Katalog yang Lebih Rapi
            </span>
          </h2>
          
          <p className="text-slate-400 text-lg max-w-xl mx-auto lg:mx-0">
            Lihat bagaimana AI membantu proses yang biasanya melelahkan jadi lebih sederhana.
            Anda tetap pegang kontrol untuk revisi sampai visual terasa pas dengan brand.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
            <button className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-white text-slate-900 text-lg font-bold shadow-lg hover:bg-slate-200 transition-colors">
              <span>Mulai Coba</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Player Mockup */}
        <div className="flex-1 w-full max-w-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/30 to-purple-500/30 rounded-3xl blur-2xl -z-10 group-hover:blur-3xl transition-all duration-500"></div>
          
          <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl flex items-center justify-center">
            {/* Placeholder for actual video - using a stylish mockup for now */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
            
            {/* Mock Editor UI Overlay */}
            <div className="absolute inset-4 border border-white/10 rounded-xl bg-black/40 backdrop-blur-md flex flex-col hidden md:flex">
                <div className="h-10 border-b border-white/10 flex items-center px-4 gap-2">
                    <div className="size-3 rounded-full bg-red-500/80"></div>
                    <div className="size-3 rounded-full bg-yellow-500/80"></div>
                    <div className="size-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="flex-1 flex p-2 gap-2">
                    <div className="w-16 bg-white/5 rounded-lg border border-white/5"></div>
                    <div className="flex-1 bg-white/5 rounded-lg border border-white/5 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute w-1/2 h-full bg-blue-500/20 blur-xl animate-pulse"></div>
                    </div>
                </div>
            </div>

            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="relative z-20 w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all duration-300 group/btn"
            >
              <div className="absolute inset-0 rounded-full bg-white/5 animate-ping"></div>
              <Play className="w-8 h-8 text-white ml-1 group-hover/btn:text-purple-300 transition-colors" fill="currentColor" />
            </button>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
              <span className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-md text-sm text-white font-medium">
                Lihat Demo Singkat (0:45)
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
