"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Zap, MonitorPlay, ArrowRight, Brush, Wand2, Upload, Download, ShoppingBag, ImageOff, Copy, Banknote } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen antialiased relative overflow-x-hidden font-sans dark">
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
          </header>

          {/* Hero Section */}
          <div className="pt-12 pb-20 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex flex-col gap-8 flex-1 lg:pr-10 z-10">
              <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-full px-4 py-1.5 w-max border border-purple-500/30">
                <Sparkles className="text-purple-400 h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Desain Berbasis AI v2.0</span>
              </div>
              <div className="flex flex-col gap-4 text-left">
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-300">
                  Desain Profesional, <br />Dibantu oleh AI
                </h1>
                <h2 className="text-slate-400 text-lg lg:text-xl font-normal leading-relaxed max-w-xl">
                  Buat grafis yang memukau dan siap pakai dalam hitungan detik dengan alat desain AI canggih kami. Tanpa perlu keahlian desain.
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={handleLogin} className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-purple-600 text-white text-lg font-bold shadow-[0_0_20px_rgba(108,43,238,0.5)] hover:bg-purple-500 hover:scale-105 transition-all duration-300">
                  <span>Mulai Desain Gratis</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-white/5 border border-white/10 text-white text-lg font-medium hover:bg-white/10 transition-colors">
                  <MonitorPlay className="h-5 w-5" />
                  <span>Tonton Demo</span>
                </button>
              </div>
            </div>

            {/* Hero Image / Abstract Mockup */}
            <div className="flex-1 w-full relative group perspective-1000">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/40 to-blue-500/40 rounded-2xl blur-2xl -z-10 group-hover:blur-3xl transition-all duration-500"></div>
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl aspect-[4/3] w-full border border-white/10 overflow-hidden relative shadow-2xl transform transition-transform duration-500 hover:scale-[1.02]">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                <div className="absolute inset-4 border border-white/10 rounded-xl flex flex-col p-4 z-10 bg-slate-950/40 backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                    <div className="flex gap-2">
                      <div className="size-3 rounded-full bg-red-500"></div>
                      <div className="size-3 rounded-full bg-yellow-500"></div>
                      <div className="size-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs text-white/50 font-mono">canvas_editor.ai</span>
                  </div>
                  <div className="flex-1 flex gap-4">
                    <div className="w-1/4 flex flex-col gap-2">
                      <div className="h-8 bg-white/10 rounded-lg w-full"></div>
                      <div className="h-8 bg-white/5 rounded-lg w-full"></div>
                      <div className="h-8 bg-purple-500/20 rounded-lg w-full border border-purple-500/30"></div>
                      <div className="h-8 bg-white/5 rounded-lg w-full"></div>
                    </div>
                    <div className="flex-1 bg-gradient-to-br from-white/5 to-transparent rounded-lg border border-white/10 flex items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-60"></div>
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl z-10 flex items-center gap-3">
                        <Zap className="text-purple-400 h-5 w-5 animate-pulse" />
                        <span className="text-sm font-medium text-white">Sedang membuat aset...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cara Kerjanya Section */}
          <div id="how-it-works" className="flex flex-col gap-12 py-20 border-t border-white/5 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Sangat Mudah</span>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white">Cara Kerjanya</h1>
              <p className="text-slate-400 text-lg max-w-[600px]">Tidak perlu jago desain atau sewa fotografer.</p>
            </div>
            
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 px-4 md:px-0">
              {/* Connector Lines (only visible on md+) */}
              <div className="hidden md:block absolute top-[2.5rem] left-[16%] right-[16%] h-[2px] bg-white/10 z-0" />
              
              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mb-6 border-4 border-slate-900 shadow-[0_0_15px_rgba(108,43,238,0.3)]">
                  <Upload className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">1. Upload Foto</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Foto dari HP pun bisa! Langsung drag & drop produk Anda ke alat AI yang dipilih.
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 border-4 border-slate-900 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:scale-105 transition-transform cursor-default">
                  <Wand2 className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">2. Pilih Tools AI</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Pilih tool yang Anda butuhkan — ganti background, hapus noda, atau perbaiki kualitas.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 border-4 border-slate-900 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:scale-105 transition-transform cursor-default">
                  <Download className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">3. Download & Pakai</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Unduh hasil bersih resolusi tinggi dan langsung upload ke toko online / marketplace Anda.
                </p>
              </div>
            </div>
          </div>

          {/* UMKM Feature Highlights Section */}
          <div className="flex flex-col gap-12 py-20 border-t border-white/5 relative">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-blue-400 font-semibold tracking-wider uppercase text-sm">Solusi Bisnis</span>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white mb-2">Kenapa UMKM Pilih Tools Kami?</h2>
              <p className="text-slate-400 text-lg max-w-[600px]">Didesain khusus untuk mempercepat jualan Anda, memotong biaya produksi foto.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                <div className="w-14 h-14 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl flex items-center justify-center mb-6">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Foto Produk Siap Jual</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Upload foto biasa dari HP, langsung disulap jadi foto produk profesional ala studio untuk etalase Shopee & Tokopedia Anda. Tingkatkan rasio klik pembeli.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                <div className="w-14 h-14 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl flex items-center justify-center mb-6">
                  <ImageOff className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Background Bersih Otomatis</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Tidak perlu sewa desainer Photoshop. Berapapun ribetnya background asli, klik sekali langsung tembus pandang atau berubah jadi pemandangan estetis.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl flex items-center justify-center mb-6">
                  <Copy className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Proses 50 Foto Sekaligus</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Mengerjakan upload produk baru yang banyak? Upload puluhan foto sekaligus, AI kami akan proses berbarengan dalam hitungan menit, bukan jam. Pangkas waktu admin.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center mb-6">
                  <Banknote className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Hemat Biaya Operasional</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Simpan margin keuntungan Anda. Tidak perlu lagi bayar jasa edit foto mingguan atau berlangganan software desain mahal, karena Anda bisa kerjakan sendiri.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Tease / CTA */}
          <div className="py-20 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 to-transparent rounded-3xl blur-xl -z-10"></div>
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-10 md:p-16 flex flex-col items-center justify-center gap-8 text-center relative overflow-hidden">
              <div className="absolute -top-24 -right-24 size-48 bg-purple-500/30 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 -left-24 size-48 bg-blue-500/20 rounded-full blur-3xl"></div>

              <div className="inline-flex items-center gap-2 bg-purple-500/20 rounded-full px-5 py-2 border border-purple-500/30 text-purple-300 font-semibold z-10 shadow-[0_0_15px_rgba(108,43,238,0.3)]">
                <Zap className="h-4 w-4" />
                <span>Penawaran Spesial</span>
              </div>

              <div className="z-10">
                <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Dapatkan 10 Kredit Gratis Saat Mendaftar</h1>
                <p className="text-slate-400 text-lg max-w-[600px] mx-auto">
                  Bergabung dengan ribuan kreator yang membuat desain lebih baik dan lebih cepat. Tidak perlu kartu kredit untuk memulai.
                </p>
              </div>

              <button onClick={handleLogin} className="z-10 flex items-center justify-center gap-2 rounded-xl h-14 px-10 bg-white text-slate-900 text-lg font-bold hover:bg-slate-200 transition-colors shadow-lg mt-4">
                <span>Klaim Kredit Gratis</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer className="flex flex-col md:flex-row justify-between items-center gap-6 py-10 border-t border-white/5 mt-10 text-slate-400">
            <div className="flex items-center gap-2">
              <Brush className="h-5 w-5 text-purple-400" />
              <span className="font-bold text-white">SmartDesign</span>
            </div>
            <div className="flex gap-8 text-sm">
              <a className="hover:text-white transition-colors" href="#">Kebijakan Privasi</a>
              <a className="hover:text-white transition-colors" href="#">Syarat & Ketentuan</a>
              <a className="hover:text-white transition-colors" href="#">Hubungi Kami</a>
            </div>
            <p className="text-sm">© 2026 SmartDesign Studio.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
