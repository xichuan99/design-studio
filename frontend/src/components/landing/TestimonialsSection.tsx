import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { TestimonialCarousel } from "@/components/landing/TestimonialCarousel";
import { Users, Image, Zap } from "lucide-react";

const TESTIMONIAL_STATS = [
  {
    icon: Zap,
    title: "2 Menit",
    description: "dari ide sampai desain siap download",
  },
  {
    icon: Image,
    title: "50 Foto",
    description: "bisa diproses sekaligus dalam satu batch",
  },
  {
    icon: Users,
    title: "3 Variasi",
    description: "desain + caption per generate",
  },
];

interface TestimonialsSectionProps {
  waitlistCount?: number | null;
}

export function TestimonialsSection({ waitlistCount }: TestimonialsSectionProps) {
  return (
    <ScrollReveal direction="left">
      <div className="py-20 border-t border-white/5 relative">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 px-4">
          {TESTIMONIAL_STATS.map((item) => (
            <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <item.icon className="w-5 h-5 text-purple-400" />
                <p className="text-white font-bold text-2xl">{item.title}</p>
              </div>
              <p className="text-slate-400 text-sm">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mb-10 px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Yang Sudah Coba Bilang Gini
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Pengalaman awal dari UMKM yang udah tes workflow SmartDesign sebelum launch resmi.
          </p>
        </div>
        <TestimonialCarousel />

        {/* Join the movement CTA */}
        <div className="text-center mt-10 px-4">
          <p className="text-slate-400 text-sm mb-2">
            {typeof waitlistCount === "number" && waitlistCount > 0 ? (
              <>
                <strong className="text-white">{waitlistCount.toLocaleString("id-ID")}+ UMKM</strong> sudah di waitlist.
                {" "}
                <strong className="text-purple-300">{Math.max(0, 500 - waitlistCount)} slot tersisa.</strong>
              </>
            ) : (
              "Batch pertama hanya untuk 500 UMKM."
            )}
          </p>
        </div>
      </div>
    </ScrollReveal>
  );
}
