import { CheckCircle2, XCircle } from "lucide-react";
import { ScrollReveal } from "@/components/landing/ScrollReveal";

const COMPARISON_ROWS = [
  { left: "Gambar mentah - keren, tapi tidak bisa diedit", right: "Desain dengan editor drag-and-drop. Edit teks, warna, layout." },
  { left: "One-shot prompt - trial and error. Prompt jelek = hasil jelek", right: "AI Interview - kami tanya 3-4 pertanyaan dulu. Hasil lebih akurat." },
  { left: "Ukuran generik - 1024x1024. Resize manual. Crop aneh", right: "Format presisi - IG Feed, Story, Shopee, Tokopedia, WA. Otomatis pas." },
  { left: "Brand lupa - tiap generate mulai dari nol", right: "Brand Kit - tempel URL toko, brand kamu tersimpan selamanya." },
  { left: "Caption terpisah - buka ChatGPT lagi, copas, edit", right: "Copywriting built-in - headline + caption + desain dalam 1 flow." },
];

export function ComparisonTableSection() {
  return (
    <ScrollReveal>
      <div className="py-20 border-t border-white/5 relative">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">AI Model Makin Canggih. Tapi...</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 mb-4">Kenapa AI Chatbot Tidak Cukup untuk Desain Bisnismu?</h2>
            <p className="text-slate-400 text-lg max-w-3xl mx-auto">
              GPT Image 2, Flux, dan Gemini - semuanya bisa generate gambar keren. Tapi coba minta poster promosi siap upload. Hasilnya: teks typo, ukuran salah, tidak bisa diedit, brand tidak ingat.
            </p>
          </div>

          <div className="overflow-x-auto mb-8">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="bg-slate-900/80 border border-white/10 rounded-tl-2xl p-5 text-slate-400 text-sm font-medium w-1/3">AI Chatbot Kasih Kamu...</th>
                  <th className="bg-purple-900/40 border border-purple-500/30 rounded-tr-2xl p-5 text-purple-300 text-sm font-medium w-2/3">SmartDesign Kasih Kamu...</th>
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
            <strong>Intinya:</strong> AI chatbot kasih kamu <em>mesin</em>. SmartDesign kasih kamu <em>seluruh bengkel</em>.
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
