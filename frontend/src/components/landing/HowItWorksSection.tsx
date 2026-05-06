import { MonitorPlay, ShoppingBag, Smartphone, Store } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

const STEPS = [
  {
    step: "1",
    title: "Ceritakan",
    description: "\"Promo lebaran baju muslim, diskon 20%, tone elegan, target ibu-ibu muda\"",
    badgeClass: "bg-purple-500/20",
    textClass: "text-purple-400",
    shadowClass: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
  },
  {
    step: "2",
    title: "AI Interview",
    description: "AI tanya: mood warna? objek utama? target pasar? - 3-4 pertanyaan, 30 detik.",
    badgeClass: "bg-blue-500/20",
    textClass: "text-blue-400",
    shadowClass: "shadow-[0_0_15px_rgba(59,130,246,0.3)]",
  },
  {
    step: "3",
    title: "Pilih Model AI",
    description: "⚡ Cepat & Murah untuk daily content. 🔥 Kualitas Premium untuk campaign penting.",
    cardClass: "border-purple-500/30 bg-purple-900/20",
    badgeClass: "bg-purple-600/30",
    textClass: "text-purple-300",
    shadowClass: "shadow-[0_0_15px_rgba(168,85,247,0.5)]",
  },
  {
    step: "4",
    title: "Generate",
    description: "AI generate 3 variasi desain. Teks benar. Brand konsisten. Siap edit.",
    badgeClass: "bg-pink-500/20",
    textClass: "text-pink-400",
    shadowClass: "shadow-[0_0_15px_rgba(236,72,153,0.3)]",
  },
  {
    step: "5",
    title: "Edit & Download",
    description: "Canvas drag-and-drop. Ganti teks, warna, logo. Download untuk IG, Shopee, WA.",
    badgeClass: "bg-emerald-500/20",
    textClass: "text-emerald-400",
    shadowClass: "shadow-[0_0_15px_rgba(16,185,129,0.3)]",
  },
];

export function HowItWorksSection() {
  return (
    <>
      <ScrollReveal>
        <div id="how-it-works" className="flex flex-col gap-12 py-20 border-t border-white/5 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Dari Cerita ke Desain Siap Upload</span>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">5 Langkah. 2 Menit. Tanpa Belajar Desain.</h2>
            <p className="text-slate-400 text-lg max-w-[600px]">Ceritakan idemu dalam bahasa Indonesia - kami yang translate ke bahasa AI, pilih model terbaik, dan generate desain siap upload.</p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10 px-4 md:px-0">
            <div className="hidden md:block absolute top-1/2 left-[8%] right-[8%] h-[2px] bg-gradient-to-r from-purple-500/0 via-purple-500/30 to-purple-500/0 -translate-y-1/2 -z-10"></div>

            {STEPS.map((step) => (
              <div
                key={step.step}
                className={`bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl hover:-translate-y-2 transition-transform duration-300 text-center ${step.cardClass ?? ""}`}
              >
                <div className={`w-14 h-14 rounded-full ${step.badgeClass} flex items-center justify-center mx-auto mb-4 border-2 border-slate-900 ${step.shadowClass}`}>
                  <span className={`${step.textClass} font-bold text-lg`}>{step.step}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      <div className="w-full py-16 border-t border-white/5 relative bg-gradient-to-b from-transparent to-purple-900/10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8">
            Hasil siap diunggah ke marketplace dan platform favorit Anda
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 text-xl font-bold text-orange-500">
              <ShoppingBag className="w-8 h-8" /> Shopee
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-green-500">
              <Store className="w-8 h-8" /> Tokopedia
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-pink-500">
              <Smartphone className="w-8 h-8" /> TikTok Shop
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-blue-500">
              <MonitorPlay className="w-8 h-8" /> Facebook Ads
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
