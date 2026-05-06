import { ScrollReveal } from "@/components/landing/ScrollReveal";

const OBJECTIONS = [
  {
    q: "\"GPT Image 2 / ChatGPT kan gratis dan hasilnya bagus...\"",
    a: "Kami juga pakai GPT Image 2 (di tier Premium). Bedanya: kami tambahkan AI Interview biar prompt optimal, editor biar bisa diedit, brand kit biar konsisten, format presisi marketplace Indonesia. Model hebat + platform = hasil maksimal."
  },
  {
    q: "\"Nanti pas launch mahal...\"",
    a: "Harga mulai dari Rp 15.000/bulan - lebih murah dari 1x sewa freelancer (Rp 150-250K). Early adopter dapat harga spesial selamanya."
  },
  {
    q: "\"Saya tidak jago teknologi...\"",
    a: "Justru ini dibuat untuk kamu. Tidak perlu belajar desain. Tidak perlu ngerti prompt engineering. Ceritakan saja - kami yang translate ke bahasa AI."
  },
  {
    q: "\"Saya sudah pakai Canva...\"",
    a: "Canva = untuk yang MAU desain. SmartDesign = untuk yang MAU desain TANPA mendesain. Dua tools berbeda, bisa dipakai bareng."
  },
  {
    q: "\"Hasil AI-nya tidak sesuai ekspektasi...\"",
    a: "Ada AI Interview sebelum generate - kamu lihat preview-nya dulu. Tidak cocok? Revisi. Tidak pakai kredit. Plus, ada editor untuk koreksi manual."
  },
  {
    q: "\"Nanti model AI-nya ganti lagi...\"",
    a: "Justru itu kenapa kami model-agnostic. Saat ini kami sudah mengintegrasikan 3 model AI premium (GPT Image 2, Flux, Gemini) - dan terus mengevaluasi model baru. Kalau ada yang lebih bagus -> tinggal plug. Kamu tidak perlu peduli - selalu dapat yang terbaik."
  },
];

export function ObjectionSection() {
  return (
    <ScrollReveal>
      <div className="py-20 border-t border-white/5 relative">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Mungkin Kamu Mikir...</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 mb-4">Kami Sudah Antisipasi Pertanyaanmu</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OBJECTIONS.map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                <p className="text-purple-300 font-medium mb-3 text-sm">{item.q}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
