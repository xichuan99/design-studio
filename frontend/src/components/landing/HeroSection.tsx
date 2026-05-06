import { ArrowRight, MonitorPlay, Sparkles } from "lucide-react";
import { PromptToDesignAnimation } from "@/components/landing/PromptToDesignAnimation";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

interface HeroSectionProps {
  onJoinWaitlist: (ctaLocation: string) => void;
}

export function HeroSection({ onJoinWaitlist }: HeroSectionProps) {
  return (
    <div className="pt-12 pb-20 flex flex-col lg:flex-row items-center gap-12">
      <div className="flex flex-col gap-8 flex-1 lg:pr-10 z-10">
        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-full px-4 py-1.5 w-max border border-purple-500/30">
          <Sparkles className="text-purple-400 h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Multi-Model AI untuk UMKM</span>
        </div>
        <div className="flex flex-col gap-4 text-left">
          <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300">
            AI Terbaik Minggu Ini, Minggu Depan, dan Seterusnya. Kamu Tinggal Cerita - Kami yang Bikin Desainnya.
          </h1>
          <h2 className="text-slate-400 text-lg lg:text-xl font-normal leading-relaxed max-w-xl">
            ChatGPT, Gemini, GPT Image 2 - semua bisa generate gambar keren. Tapi gambar != desain siap upload. SmartDesign pakai model AI TERBAIK yang ada saat ini, tanya kebutuhanmu dulu, generate desain, dan kasih kamu editor untuk koreksi. Hasilnya: poster promosi, banner marketplace, konten Instagram - siap upload dalam 1-2 menit.
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button onClick={() => onJoinWaitlist("hero_primary")} className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 w-full sm:w-auto bg-purple-600 text-white text-lg font-bold shadow-[0_0_20px_rgba(108,43,238,0.5)] hover:bg-purple-500 hover:scale-105 transition-all duration-300">
              <span className="whitespace-nowrap">Gabung Waitlist</span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </button>
            <p className="text-slate-400 text-xs text-center font-medium">Amankan akses awal dan dapatkan update peluncuran SmartDesign.</p>
          </div>
          <a href="#showcase" className="flex items-center justify-center w-full sm:w-auto gap-2 rounded-xl h-14 px-8 bg-white/5 border border-white/10 text-white text-lg font-medium hover:bg-white/10 transition-colors">
            <MonitorPlay className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">Lihat Contoh Alur</span>
          </a>
        </div>
      </div>

      <ScrollReveal className="flex-1 w-full relative group perspective-1000 z-10 scroll-mt-32" delay={300}>
        <div id="showcase">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/40 to-blue-500/40 rounded-2xl blur-3xl -z-10 group-hover:blur-2xl transition-all duration-500"></div>
          <PromptToDesignAnimation />
        </div>
      </ScrollReveal>
    </div>
  );
}
