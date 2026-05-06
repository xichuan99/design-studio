import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { TestimonialCarousel } from "@/components/landing/TestimonialCarousel";

const TESTIMONIAL_STATS = [
  {
    title: "Workflow Ringkas",
    description: "dari ide ke draft visual tanpa langkah berulang",
  },
  {
    title: "Batch hingga 50 foto",
    description: "untuk menjaga ritme produksi konten saat volume naik",
  },
  {
    title: "Multi-channel",
    description: "lebih mudah menyiapkan visual untuk social commerce & marketplace",
  },
];

export function TestimonialsSection() {
  return (
    <ScrollReveal direction="left">
      <div className="py-20 border-t border-white/5 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 px-4">
          {TESTIMONIAL_STATS.map((item) => (
            <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-white font-bold text-2xl">{item.title}</p>
              <p className="text-slate-400 text-sm">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mb-10 px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Cerita dari Pengguna Awal SmartDesign</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Gambaran pengalaman nyata saat mencoba workflow konten yang lebih terarah dan minim kebingungan.
          </p>
        </div>
        <TestimonialCarousel />
      </div>
    </ScrollReveal>
  );
}
