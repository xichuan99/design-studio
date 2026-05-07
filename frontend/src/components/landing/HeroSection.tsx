import { ArrowRight, Zap, MonitorPlay } from "lucide-react";
import { PromptToDesignAnimation } from "@/components/landing/PromptToDesignAnimation";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

interface HeroSectionProps {
  onJoinWaitlist: (ctaLocation: string) => void;
  waitlistCount: number | null;
}

export function HeroSection({ onJoinWaitlist, waitlistCount }: HeroSectionProps) {
  return (
    <div className="pt-8 pb-16 flex flex-col lg:flex-row items-center gap-12">
      <div className="flex flex-col gap-6 flex-1 lg:pr-10 z-10">
        {/* Urgency Badge */}
        <div className="inline-flex items-center gap-2 bg-purple-500/10 backdrop-blur-md rounded-full px-4 py-2 w-max border border-purple-500/30 animate-pulse">
          <Zap className="text-yellow-400 h-4 w-4 fill-yellow-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
            Batch Pertama Dibuka — Hanya 500 Slot
          </span>
        </div>

        <div className="flex flex-col gap-4 text-left">
          <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-purple-400">
            Dari Chat ke Desain Siap Upload dalam 2 Menit
          </h1>
          <h2 className="text-slate-400 text-lg lg:text-xl font-normal leading-relaxed max-w-xl">
            ChatGPT bisa bikin gambar. Tapi kamu masih harus resize, tambah teks, sesuaikan brand, dan buat caption.
            <strong className="text-white"> SmartDesign lakuin semuanya</strong> — gambar + desain + caption + format pas, dalam satu klik.
          </h2>
        </div>

        {/* Social Proof Micro */}
        {typeof waitlistCount === "number" && waitlistCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-bold">A</div>
              <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-bold">B</div>
              <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-bold">C</div>
            </div>
            <span><strong className="text-white">{waitlistCount.toLocaleString("id-ID")}+ UMKM</strong> sudah mengantri</span>
          </div>
        )}

        {/* Primary CTA Block */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={() => onJoinWaitlist("hero_primary")}
              className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-500 text-white text-lg font-bold shadow-[0_0_30px_rgba(108,43,238,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:scale-105 transition-all duration-300"
            >
              <span className="whitespace-nowrap">Daftar Gratis — Dapat 100 Kredit</span>
              <ArrowRight className="h-5 w-5 shrink-0" />
            </button>
            <p className="text-slate-400 text-xs text-center font-medium">
              + Bonus PDF <strong className="text-purple-300">30 Ide Konten UMKM</strong> langsung ke email
            </p>
          </div>
          <a
            href="#how-it-works"
            className="flex items-center justify-center w-full sm:w-auto gap-2 rounded-xl h-14 px-8 bg-white/5 border border-white/10 text-white text-lg font-medium hover:bg-white/10 transition-colors"
          >
            <MonitorPlay className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">Lihat Cara Kerja</span>
          </a>
        </div>

        {/* Trust Signals */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="text-green-400">✓</span> Tanpa kartu kredit</span>
          <span className="flex items-center gap-1"><span className="text-green-400">✓</span> Bisa batal kapan saja</span>
          <span className="flex items-center gap-1"><span className="text-green-400">✓</span> 100 kredit cukup untuk 2 desain</span>
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
