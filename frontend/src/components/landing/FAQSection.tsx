"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Apakah aplikasi ini gratis digunakan?",
    answer: "Ya, Anda bisa mulai gratis tanpa kartu kredit. Setelah itu, Anda hanya bayar saat butuh lewat sistem kredit (tanpa langganan bulanan), jadi biaya tetap fleksibel untuk skala UMKM."
  },
  {
    question: "Berapa lama proses edit fotonya?",
    answer: "Proses edit umumnya terasa cepat untuk kebutuhan harian. Durasi tetap bisa berbeda tergantung kualitas file awal, antrean proses, dan jenis fitur yang dipakai."
  },
  {
    question: "Format file apa saja yang didukung?",
    answer: "Saat ini kami mendukung format JPG, PNG, dan WEBP untuk foto yang diunggah. Hasil editan bisa diunduh dalam kualitas tinggi (hingga 4K) berformat PNG dengan background transparan atau JPG."
  },
  {
    question: "Bagaimana kualitas hasil fotonya untuk katalog marketplace?",
    answer: "Kualitas akhir mengikuti kualitas foto awal dan jenis proses yang dipilih. SmartDesign membantu meningkatkan ketajaman, pencahayaan, dan konsistensi visual agar lebih siap untuk katalog marketplace, sambil tetap memberi kontrol edit manual jika perlu penyesuaian akhir."
  },
  {
    question: "Bagaimana cara kerja sistem kreditnya?",
    answer: "Kami tidak memakai langganan bulanan. Anda membeli kredit sesuai kebutuhan, lalu kredit terpotong saat proses AI dijalankan. Dengan model ini, Anda bisa mengontrol biaya produksi konten berdasarkan volume kerja aktual."
  },
  {
    question: "Bisakah saya mengedit langsung dari HP?",
    answer: "Tentu! SmartDesign Studio dirancang sepenuhnya responsif, sehingga Anda bisa memfoto produk dengan HP dan langsung mengeditnya melalui browser di HP Anda."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First one open by default

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full py-24 relative">
      <div className="absolute top-0 right-0 w-1/3 h-[1px] bg-gradient-to-l from-transparent via-purple-500/50 to-transparent"></div>
      
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Bantuan</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-4">Pertanyaan yang Sering Diajukan</h2>
          <p className="text-slate-400">Punya pertanyaan lain? Tim support kami siap membantu Anda.</p>
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
