"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Daftar gratis dapat apa aja?",
    answer: "100 kredit + PDF '30 Ide Konten UMKM Bulan Ini' langsung ke email. 100 kredit cukup buat 2-3 desain pertama tanpa bayar sepeser pun. Nggak perlu kartu kredit. Nggak ada komitmen."
  },
  {
    question: "Berapa lama proses edit fotonya?",
    answer: "Edit standar selesai dalam 3-10 detik. Generate desain dari nol butuh 1-2 menit. Batch edit 50 foto? Sekitar 5 menit. Semua async — kamu bisa tinggal dan dapat notifikasi kalau sudah jadi."
  },
  {
    question: "Format file apa saja yang didukung?",
    answer: "Upload: JPG, PNG, WEBP. Download: PNG transparan (untuk logo), JPG kualitas tinggi, atau PDF (untuk print). Semua hasil up to 4K resolution. Siap langsung upload ke Shopee, Tokopedia, Instagram."
  },
  {
    question: "Kualitas hasilnya bagus untuk katalog marketplace?",
    answer: "SmartDesign pakai model AI tier premium (Flux Pro, GPT Image 2) untuk output. Ditambah AI Interview sebelum generate biar hasil sesuai kebutuhan. Kalau kurang puas? Ada editor drag-and-drop buat koreksi."
  },
  {
    question: "Gimana cara kerja sistem kreditnya?",
    answer: "Mirip pulsa HP. Beli kredit sekali, pakai kapan aja. Nggak hangus. Tier 1 (5 kredit) untuk edit ringan. Tier 4 (40 kredit) untuk generate desain full AI. Kamu yang kontrol mau hemat atau maksimal."
  },
  {
    question: "Bisa pakai dari HP?",
    answer: "100%. SmartDesign responsif penuh. Foto produk pakai HP → edit langsung di browser HP → download → upload ke Instagram/Shopee. Nggak perlu install app."
  },
  {
    question: "Kenapa nggak pakai ChatGPT/Gemini aja?",
    answer: "ChatGPT bagus buat ide. Tapi hasilnya gambar mentah: nggak bisa diedit, ukuran generik, brand nggak tersimpan, caption terpisah. SmartDesign gabungin AI Interview + model terbaik + editor + brand kit + format pas + caption jadi. Dari chat langsung jadi desain siap upload."
  },
  {
    question: "Apa bedanya model AI Basic, Pro, dan Ultra?",
    answer: "Basic (Flux Schnell): cepat + hemat. Cocok untuk konten harian. Pro (Flux Pro): detail lebih tajam, lighting lebih natural. Ultra (GPT Image 2): kualitas tertinggi, cocok untuk campaign flagship. Kamu pilih sesuai budget dan kebutuhan."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full py-24 relative">
      <div className="absolute top-0 right-0 w-1/3 h-[1px] bg-gradient-to-l from-transparent via-purple-500/50 to-transparent"></div>

      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Masih Ragu?</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">Pertanyaan yang Sering Diajukan</h2>
          <p className="text-slate-400">Kalau masih ada yang belum jelas, tim kami siap jawab via WhatsApp.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 ${
                openIndex === index ? "bg-white/10 shadow-[0_0_20px_rgba(108,43,238,0.15)]" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-2xl"
                aria-expanded={openIndex === index}
              >
                <span className={`font-semibold md:text-lg transition-colors ${openIndex === index ? "text-purple-300" : "text-white"}`}>
                  {faq.question}
                </span>
                <div className={`flex-shrink-0 ml-4 p-1 rounded-full transition-transform duration-300 ${openIndex === index ? "rotate-180 bg-purple-500/20 text-purple-400" : "text-slate-400"}`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-6 pb-6 pt-0 text-slate-300 leading-relaxed border-t border-white/5 mt-2">
                  <p className="pt-4">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
