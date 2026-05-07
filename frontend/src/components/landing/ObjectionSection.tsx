import { ScrollReveal } from "@/components/landing/ScrollReveal";

const OBJECTIONS = [
  {
    q: "GPT Image 2 kan gratis dan bagus...",
    a: "Betul, dan kami juga pakai GPT Image 2 (di tier Ultra). Tapi coba minta poster promo siap upload: teksnya typo, ukuran salah, nggak bisa diedit. SmartDesign nambahin AI Interview, editor, brand kit, dan format pas — supaya gambar bagus jadi desain siap jual."
  },
  {
    q: "Nanti pas launch mahal ya?",
    a: "Early adopter dapat harga terkunci selamanya. Paket Pro Rp 50.000 untuk 500 kredit — lebih murah dari 1x sewa freelancer (Rp 150-250K). Dan nggak ada langganan wajib."
  },
  {
    q: "Saya nggak jago teknologi...",
    a: "Justru ini dibuat untuk kamu. Nggak perlu belajar desain. Nggak perlu ngerti prompt engineering. Ceritakan aja — kami yang translate ke bahasa AI. Kalau hasil kurang pas, tinggal geser-geser di editor."
  },
  {
    q: "Saya udah pakai Canva...",
    a: "Canva = untuk yang MAU desain. SmartDesign = untuk yang MAU hasil desain TANPA harus mendesain. Dua tools berbeda, bisa dipakai bareng. Pakai Canva kalau ada waktu. Pakai SmartDesign kalau butuh cepat."
  },
  {
    q: "Hasil AI-nya nggak sesuai ekspektasi...",
    a: "Ada AI Interview sebelum generate — kamu lihat preview brief dulu. Nggak cocok? Revisi tanpa pakai kredit. Plus ada editor drag-and-drop buat koreksi manual. Kamu tetap punya kontrol penuh."
  },
  {
    q: "Nanti model AI-nya ganti lagi...",
    a: "Justru itu keunggulan kami: model-agnostic. Saat ini 3 model premium (GPT Image 2, Flux, Gemini) — terus evaluasi model baru. Kalau ada yang lebih bagus? Langsung plug. Kamu nggak perlu peduli, selalu dapat yang terbaik."
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
                <p className="text-purple-300 font-medium mb-3 text-sm">&quot;{item.q}&quot;</p>
                <p className="text-slate-400 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
