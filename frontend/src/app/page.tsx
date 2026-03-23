"use client";

import { useRouter } from "next/navigation";
import { Sparkles, MonitorPlay, ArrowRight, Brush, Wand2, Upload, Download, ShoppingBag, ImageOff, Copy, Banknote, Store, Smartphone, Menu, X, CheckCircle2, XCircle } from "lucide-react";
import { CapabilityMarquee } from "@/components/landing/CapabilityMarquee";
import { BeforeAfterSlider } from "@/components/landing/BeforeAfterSlider";
import { ResultGallery } from "@/components/landing/ResultGallery";
import { VideoDemoSection } from "@/components/landing/VideoDemoSection";
import { TestimonialCarousel } from "@/components/landing/TestimonialCarousel";
import { FAQSection } from "@/components/landing/FAQSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { NumberCounter } from "@/components/landing/NumberCounter";
import { Gift, Mail } from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = () => {
    router.push("/login");
  };

  const jsonLD = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SmartDesign Studio",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "10000",
      "priceCurrency": "IDR",
    },
    "description": "Platform AI untuk otomatisasi desain dan foto produk spesifik untuk UMKM Indonesia."
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen antialiased relative overflow-x-hidden font-sans dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLD) }}
      />
      {/* Background Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(108,43,238,0.15)_0%,rgba(11,9,16,0)_70%)] pointer-events-none -z-10 blur-3xl"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(66,135,245,0.1)_0%,rgba(11,9,16,0)_70%)] pointer-events-none -z-10 blur-3xl"></div>

      <div className="relative flex min-h-screen w-full flex-col z-10 px-4 md:px-10 lg:px-40 py-5">
        <div className="max-w-[1200px] w-full mx-auto flex flex-col flex-1">

          {/* Header */}
          <header className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 mb-8 sticky top-4 z-50">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(108,43,238,0.5)]">
                <Brush className="text-white h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">SmartDesign</h2>
            </div>
            <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
              <nav className="flex items-center gap-8">
                <a className="text-slate-300 hover:text-purple-400 transition-colors text-sm font-medium" href="#features">Fitur</a>
                <a className="text-slate-300 hover:text-purple-400 transition-colors text-sm font-medium" href="#how-it-works">Cara Kerja</a>
                <a className="text-slate-300 hover:text-purple-400 transition-colors text-sm font-medium" href="#pricing">Harga</a>
              </nav>
              <div className="flex gap-3">
                <button onClick={handleLogin} className="rounded-lg h-10 px-5 border border-slate-700 hover:bg-slate-800 text-white text-sm font-medium transition-all">
                  Masuk
                </button>
                <button onClick={handleLogin} className="rounded-lg h-10 px-5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(108,43,238,0.5)] transition-all">
                  Daftar
                </button>
              </div>
            </div>
            {/* Mobile hamburger */}
            <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </header>
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-6 mb-4 flex flex-col gap-4 animate-in slide-in-from-top z-40">
              <a className="text-slate-200 hover:text-purple-400 transition-colors font-medium py-2" href="#features" onClick={() => setMobileMenuOpen(false)}>Fitur</a>
              <a className="text-slate-200 hover:text-purple-400 transition-colors font-medium py-2" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>Cara Kerja</a>
              <a className="text-slate-200 hover:text-purple-400 transition-colors font-medium py-2" href="#pricing" onClick={() => setMobileMenuOpen(false)}>Harga</a>
              <hr className="border-white/10" />
              <button onClick={() => { handleLogin(); setMobileMenuOpen(false); }} className="rounded-lg h-12 bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all">
                Coba Gratis — Dapat 3 Kredit
              </button>
            </div>
          )}

          {/* Hero Section */}
          <div className="pt-12 pb-20 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex flex-col gap-8 flex-1 lg:pr-10 z-10">
              <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-full px-4 py-1.5 w-max border border-purple-500/30">
                <Sparkles className="text-purple-400 h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Desain Berbasis AI v2.0</span>
              </div>
              <div className="flex flex-col gap-4 text-left">
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300">
                  Dari Cerita Jadi Desain <br />Siap Posting dalam 30 Detik
                </h1>
                <h2 className="text-slate-400 text-lg lg:text-xl font-normal leading-relaxed max-w-xl">
                  Bukan sekadar generate gambar — tapi desain siap pakai dengan ukuran pas, warna sesuai brand, dan teks yang bisa langsung kamu edit.
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={handleLogin} className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-purple-600 text-white text-lg font-bold shadow-[0_0_20px_rgba(108,43,238,0.5)] hover:bg-purple-500 hover:scale-105 transition-all duration-300">
                  <span>Coba Gratis — Tanpa Kartu Kredit</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a href="#showcase" className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-white/5 border border-white/10 text-white text-lg font-medium hover:bg-white/10 transition-colors">
                  <MonitorPlay className="h-5 w-5" />
                  <span>Lihat Hasilnya ↓</span>
                </a>
              </div>
            </div>

            {/* Hero Image / Before-After Showcase */}
            <ScrollReveal className="flex-1 w-full relative group perspective-1000 z-10 scroll-mt-32" delay={300}>
              <div id="showcase">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/40 to-blue-500/40 rounded-2xl blur-3xl -z-10 group-hover:blur-2xl transition-all duration-500"></div>
                <BeforeAfterSlider 
                  beforeImage="/before-product.png" 
                  afterImage="/after-product.png" 
                  className="shadow-2xl border border-white/10"
                  altText="Perbandingan foto produk sebelum dan sesudah diedit menggunakan AI SmartDesign Studio"
                />
              </div>
            </ScrollReveal>
          </div>

          {/* Capability Marquee */}
          <ScrollReveal>
            <div className="py-20 border-t border-white/5 relative">
              <div className="max-w-5xl mx-auto px-4">
                <div className="text-center mb-10">
                  <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Realita di Lapangan</span>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mt-4 mb-4">AI Bisa Bikin Gambar. Tapi Belum Tentu Siap Posting.</h2>
                  <p className="text-slate-400 text-lg max-w-3xl mx-auto">
                    Banyak pemilik bisnis sudah coba AI. Masalahnya bukan di hasil gambar, tapi di proses yang masih bikin kerjaan jadi panjang.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4">Yang Sering Terjadi</h3>
                    <ul className="space-y-3 text-slate-300 text-sm">
                      <li className="flex items-start gap-2"><XCircle className="w-4 h-4 mt-0.5 text-red-400 shrink-0" /> Teks sering typo atau kurang pas untuk promosi</li>
                      <li className="flex items-start gap-2"><XCircle className="w-4 h-4 mt-0.5 text-red-400 shrink-0" /> Warna output tidak konsisten dengan brand</li>
                      <li className="flex items-start gap-2"><XCircle className="w-4 h-4 mt-0.5 text-red-400 shrink-0" /> Ukuran desain harus resize ulang manual</li>
                      <li className="flex items-start gap-2"><XCircle className="w-4 h-4 mt-0.5 text-red-400 shrink-0" /> Harus ulang jelaskan logo dan style setiap kali</li>
                    </ul>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-white font-bold mb-4">Dengan SmartDesign Studio</h3>
                    <ul className="space-y-3 text-slate-300 text-sm">
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-green-400 shrink-0" /> Prompt sederhana, hasil tetap terstruktur</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-green-400 shrink-0" /> Desain mengikuti konteks visual bisnis UMKM</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-green-400 shrink-0" /> Siap format IG, FB, dan marketplace</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 text-green-400 shrink-0" /> Tetap bisa diedit langsung di canvas</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-900/25 to-blue-900/25 border border-purple-500/20 rounded-2xl p-5 text-center text-slate-300">
                  Bukan karena kamu kurang jago prompt. Memang kebanyakan AI chatbot tidak dirancang untuk alur desain bisnis end-to-end.
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Capability Marquee */}
          <div className="mb-20">
            <CapabilityMarquee />
          </div>

          {/* Video Demo Section */}
          <VideoDemoSection />

          {/* Result Gallery (Output Showcase) */}
          <div>
            <ResultGallery />
          </div>

          {/* Cara Kerjanya Section */}
          <ScrollReveal>
            <div id="how-it-works" className="flex flex-col gap-12 py-20 border-t border-white/5 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Sangat Mudah</span>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">3 Langkah. 30 Detik. Selesai.</h2>
                <p className="text-slate-400 text-lg max-w-[600px]">Tidak perlu jago desain atau sewa fotografer mahal.</p>
              </div>
              
              <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 px-4 md:px-0">
                <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-purple-500/0 via-purple-500/30 to-purple-500/0 -translate-y-1/2 -z-10"></div>
                
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-6 border-4 border-slate-900 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-105 transition-transform cursor-default">
                    <Upload className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">1. Upload Foto</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Ambil foto produk dari HP Anda dengan background seadanya. Tidak perlu pencahayaan studio.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 border-4 border-slate-900 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform cursor-default">
                    <Wand2 className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">2. Pilih Alat AI</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Pilih alat yang Anda butuhkan — AI kami akan menghapus background, memperbaiki kualitas, atau membuatkan scene baru.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-20 h-20 rounded-full bg-pink-500/20 flex items-center justify-center mb-6 border-4 border-slate-900 shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:scale-105 transition-transform cursor-default">
                    <Download className="w-8 h-8 text-pink-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">3. Unduh Hasilnya</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">
                    Dalam hitungan detik, foto produk Anda siap diunduh dalam resolusi tinggi dan langsung bisa dipakai jualan.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Marketplace Compatibility Strip */}
          <div className="w-full py-16 border-t border-white/5 relative bg-gradient-to-b from-transparent to-purple-900/10">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-8">
                Hasil siap diunggah ke platform favorit Anda
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

          {/* UMKM Feature Highlights Section */}
          <ScrollReveal>
            <div id="features" className="flex flex-col gap-12 py-20 border-t border-white/5 relative">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-blue-400 font-semibold tracking-wider uppercase text-sm">Solusi Bisnis</span>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white mb-2">Kenapa UMKM Pilih Kami?</h2>
                <p className="text-slate-400 text-lg max-w-[600px]">Hemat Rp <NumberCounter end={5} suffix=" Juta" /> per bulan. <NumberCounter end={50} suffix="x" /> lebih cepat dari workflow tradisional.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <div className="w-14 h-14 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl flex items-center justify-center mb-6">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">AI Redesign & Magic Text</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Hasilkan variasi desain katalog yang segar dalam hitungan detik. Jangan biarkan katalog produk Anda terlihat membosankan! Magic Text akan membantu membuat tipografi yang menarik secara otomatis, menghemat biaya jasa desainer profesional.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <div className="w-14 h-14 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl flex items-center justify-center mb-6">
                    <ImageOff className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Retouch API & Enhancement</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Tingkatkan penjualan dengan foto produk resolusi tinggi, cerah, dan tajam. Tersedia juga fitur ID Photo untuk pas foto bisnis dan Watermark otomatis untuk melindungi hak cipta produk Anda.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl flex items-center justify-center mb-6">
                    <Copy className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">AI Copywriting & Clarify</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Bebas dari writer&apos;s block! Bingung menulis caption promosi? AI Copywriting siap membuatkan teks promosi yang menarik, relevan, dan persuasif untuk menarik pembeli.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center mb-6">
                    <Banknote className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Batch Processing 50 Foto</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Punya ratusan produk baru? Jangan edit satu-satu! Gunakan fitur Batch Processing untuk mengaplikasikan efek, mengganti background, atau menambahkan watermark sekaligus dalam hitungan menit.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Audience Fit Section */}
          <ScrollReveal>
            <div className="py-20 border-t border-white/5 relative">
              <div className="flex flex-col items-center gap-4 text-center mb-10 px-4">
                <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Untuk Siapa</span>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight text-white">SmartDesign Dibuat untuk Pelaku UMKM yang Butuh Gerak Cepat</h2>
                <p className="text-slate-400 text-lg max-w-3xl">
                  Cocok untuk kamu yang butuh konten rutin, tapi tidak punya waktu panjang untuk desain manual setiap hari.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4">
                {[
                  "Pemilik warung, kafe, atau toko online yang butuh konten promo harian",
                  "Seller fashion yang perlu foto produk lebih rapi dan konsisten",
                  "Pemilik jasa (salon, klinik, kursus) yang ingin terlihat profesional di media sosial",
                  "Reseller yang ingin produksi konten cepat tanpa proses desain berulang",
                ].map((item) => (
                  <div key={item} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-slate-200 text-sm md:text-base flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Testimonials */}
          <ScrollReveal direction="left">
            <div className="py-20 border-t border-white/5 relative">
              <div className="text-center mb-10 px-4">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Dipercaya oleh Kreator & UMKM</h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                  Lihat apa kata mereka yang sudah membuktikan kecepatan dan kemudahan SmartDesign Studio.
                </p>
              </div>
              <TestimonialCarousel />
            </div>
          </ScrollReveal>

          {/* FAQ Section */}
          <ScrollReveal>
            <FAQSection />
          </ScrollReveal>

          {/* Full Pricing / Credit Store */}
          <ScrollReveal direction="up" delay={200}>
            <PricingSection />
          </ScrollReveal>

          {/* Final CTA */}
          <ScrollReveal>
            <div className="py-20 border-t border-white/5 relative">
              <div className="mx-4 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-900/35 to-blue-900/30 p-8 md:p-12 text-center">
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
                  Konten Harian Bisnismu Tidak Harus Makan Waktu Seharian
                </h2>
                <p className="text-slate-300 text-base md:text-lg max-w-3xl mx-auto mb-8">
                  Mulai dari satu brief sederhana, lalu ubah jadi desain yang siap dipakai untuk promosi harian. Lebih cepat, lebih konsisten, dan tetap bisa kamu edit.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={handleLogin}
                    className="flex items-center justify-center gap-2 rounded-xl h-12 px-7 bg-purple-600 text-white font-bold shadow-[0_0_20px_rgba(108,43,238,0.5)] hover:bg-purple-500 transition-all"
                  >
                    <span>Mulai Gratis</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <a
                    href="#showcase"
                    className="flex items-center justify-center gap-2 rounded-xl h-12 px-7 bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
                  >
                    Lihat Contoh Desain
                  </a>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Footer & Growth Section */}
          <footer className="mt-20 pt-16 pb-8 border-t border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 px-4">
              
              {/* Brand & Newsletter Column */}
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="flex items-center gap-2">
                  <Brush className="h-6 w-6 text-purple-400" />
                  <span className="font-bold text-white text-xl tracking-tight">SmartDesign Studio</span>
                </div>
                <p className="text-slate-400 max-w-sm">
                  Otomatisasi desain katalog produk khusus UMKM Indonesia dengan teknologi AI terdepan.
                </p>
                
                {/* Email Capture Form */}
                <div className="mt-2 text-sm text-slate-300">
                  <p className="mb-3 font-semibold text-white">Dapatkan Tips & Promo Eksklusif</p>
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); alert("Thanks for subscribing!"); }}>
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        type="email" 
                        placeholder="Email Anda..." 
                        required
                        className="w-full bg-slate-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors">
                      Subscribe
                    </button>
                  </form>
                </div>
              </div>

              {/* Links Column */}
              <div className="md:col-span-3 flex flex-col gap-4">
                <h4 className="font-bold text-white mb-2">Produk</h4>
                <a href="#how-it-works" className="text-slate-400 hover:text-white transition-colors">Cara Kerja</a>
                <a href="#showcase" className="text-slate-400 hover:text-white transition-colors">Galeri Hasil</a>
                <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">Harga Kredit</a>
                <a href="/login" className="text-slate-400 hover:text-white transition-colors">Login / Daftar</a>
              </div>

              {/* Referral / Community Column */}
              <div className="md:col-span-4 flex flex-col gap-4">
                <h4 className="font-bold text-white mb-2">Komunitas</h4>
                
                {/* Referral Teaser */}
                <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/20 p-4 rounded-xl flex items-start gap-4 mb-4 mt-2">
                  <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400 shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-white font-bold text-sm mb-1">Ajak Teman, Dapat Kredit!</h5>
                    <p className="text-slate-400 text-xs">Undang UMKM lain dan dapatkan <span className="text-purple-400 font-bold">10 Kredit Bonus</span> untuk setiap teman yang mendaftar.</p>
                  </div>
                </div>

                <div className="flex gap-4 mt-2">
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white text-slate-400 transition-colors">IG</a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white text-slate-400 transition-colors">TT</a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white text-slate-400 transition-colors">WA</a>
                </div>
              </div>

            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10 text-slate-500 text-sm px-4">
              <p>© 2026 SmartDesign Studio. Seluruh hak cipta dilindungi.</p>
              <div className="flex gap-6">
                <a className="hover:text-white transition-colors" href="#">Syarat & Ketentuan</a>
                <a className="hover:text-white transition-colors" href="#">Kebijakan Privasi</a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
