import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

const COMPARISON_ROWS = [
  { left: "Gambar mentah — keren, tapi nggak bisa diedit sama sekali", right: "Desain dengan editor drag-and-drop. Geser teks, ganti warna, tambah logo. Semua bisa." },
  { left: "One-shot prompt — salah = ulang dari awal. Boros waktu", right: "AI Interview 3 pertanyaan dulu. Hasil 3x lebih akurat. Nggak perlu jadi prompt engineer." },
  { left: "Ukuran 1024×1024 doang. Resize manual. Sering kepotong", right: "Format otomatis pas: IG Feed, Story, Shopee, Tokopedia, WA. Langsung upload." },
  { left: "Brand dihapus tiap generate. Setup ulang terus", right: "Brand Kit tersimpan permanen. Logo + warna + font. Setiap desain otomatis on-brand." },
  { left: "Caption terpisah — buka ChatGPT, copas, format ulang", right: "Headline + caption + CTA jadi satu. 3 variasi. Tinggal copas ke Instagram / Shopee." },
];

export function ComparisonTableSection() {
  return (
    <ScrollReveal>
      <div className="py-20 border-t border-white/5 relative">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-red-500/10 rounded-full px-4 py-1.5 mb-4 border border-red-500/20">
              <AlertTriangle className="text-red-400 h-4 w-4" />
              <span className="text-xs font-bold text-red-300 uppercase tracking-wider">Baca Ini Sebelum Pakai ChatGPT Saja</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 mb-4">
              ChatGPT Bikin Gambar. SmartDesign Bikin Desain Siap Jual.
            </h2>
            <p className="text-slate-400 text-lg max-w-3xl mx-auto">
              GPT Image 2, Flux, Gemini — semua bisa generate gambar keren. Tapi coba minta poster promo siap upload. Hasilnya: teks typo, ukuran salah, nggak bisa diedit, brand ilang.
            </p>
          </div>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="bg-slate-900/80 border border-white/10 rounded-tl-2xl p-5 text-slate-400 text-sm font-medium w-1/3">Pakai ChatGPT/Gemini Saja...</th>
                  <th className="bg-purple-900/40 border border-purple-500/30 rounded-tr-2xl p-5 text-purple-300 text-sm font-medium w-2/3">Pakai SmartDesign Studio...</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i}>
                    <td className="bg-white/5 border border-white/10 p-5 text-slate-300 text-sm">
                      <span className="flex items-start gap-2"><XCircle className="w-4 h-4 mt-0.5 text-red-400 shrink-0" /> {row.left}</span>
                    </td>
                    <td className="bg-purple-900/20 border border-purple-500/20 p-5 text-slate-200 text-sm">
                      <span className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-green-400 shrink-0" /> {row.right}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gradient-to-r from-purple-900/25 to-blue-900/25 border border-purple-500/20 rounded-2xl p-5 text-center text-slate-300">
            <strong>Intinya:</strong> AI chatbot kasih kamu <em>mesin</em>. SmartDesign kasih kamu <em>seluruh bengkel</em> — tinggal gas.
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
