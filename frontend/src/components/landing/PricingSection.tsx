"use client";

import { Check, Star, Info, ArrowRight, Lock } from "lucide-react";

interface PricingSectionProps {
  onJoinWaitlist?: (ctaLocation: string) => void;
}

export function PricingSection({ onJoinWaitlist }: PricingSectionProps) {
  return (
    <div className="w-full py-24 relative" id="pricing">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 rounded-full px-4 py-1.5 mb-4 border border-purple-500/30">
            <Lock className="text-purple-400 h-4 w-4" />
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Harga Terkunci untuk Early Adopter</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-4 mb-6">Bayar Seperti Pulsa HP</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Nggak ada langganan bulanan. Beli kredit saat butuh. Sisanya bisa dipake besok, minggu depan, atau bulan depan. Nggak hangus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Starter</p>
            <h3 className="mt-2 text-xl font-bold text-white">Konten Harian</h3>
            <p className="mt-2 text-sm text-slate-400">Cepat, hemat, konsisten. Cocok untuk post rutin Instagram dan Shopee.</p>
          </div>
          <div className="rounded-2xl border border-purple-500/20 bg-purple-900/15 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">Pro ⭐</p>
            <h3 className="mt-2 text-xl font-bold text-white">Campaign Penting</h3>
            <p className="mt-2 text-sm text-slate-300">Detail lebih tajam. Produk lebih menonjol. Pas untuk promo besar.</p>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-900/15 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Business</p>
            <h3 className="mt-2 text-xl font-bold text-white">Campaign Premium</h3>
            <p className="mt-2 text-sm text-slate-300">Kualitas tertinggi. Hanya untuk desain flagship yang benar-benar harus wow.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* Credit Packages (Left / Top) */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">

            {/* Starter */}
            <div className="p-6 rounded-3xl border border-white/10 bg-white/5">
              <div className="text-slate-400 font-medium mb-2">Paket Starter</div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-white">Rp 15.000</span>
              </div>
              <div className="flex items-center gap-2 mb-6 p-2 rounded-lg bg-black/30">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="font-bold text-white text-lg">100 Kredit</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-2"><Check className="w-4 h-4 text-green-400 shrink-0" /> Daily claim 5 kredit/hari</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-green-400 shrink-0" /> Akses semua tools AI</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-green-400 shrink-0" /> Model Basic + Auto</li>
              </ul>
            </div>

            {/* Popular */}
            <div className="p-6 rounded-3xl border relative border-purple-500/30 bg-purple-900/15 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                Paling Laris untuk UMKM
              </div>
              <div className="text-slate-200 font-medium mb-2 mt-2">Paket Pro</div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-white">Rp 50.000</span>
                <span className="text-slate-400 text-sm line-through">Rp 75.000</span>
              </div>
              <div className="flex items-center gap-2 mb-6 p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="font-bold text-white text-lg">500 Kredit</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-2"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Lebih hemat per desain</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Daily claim 10 kredit/hari</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Buka model Pro (Flux Pro)</li>
              </ul>
            </div>

            {/* Business */}
            <div className="p-6 rounded-3xl border border-white/10 bg-white/5 sm:col-span-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-slate-400 font-medium mb-1">Paket Business</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">Rp 150.000</span>
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded font-bold">Paling hemat per kredit</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Daily claim 20 kredit/hari + akses Ultra (GPT Image 2)</div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-black/30 border border-white/10 w-full sm:w-auto justify-center">
                  <Star className="w-6 h-6 text-yellow-500 fill-current" />
                  <span className="font-bold text-white text-xl">2000 Kredit</span>
                </div>
              </div>
            </div>

          </div>

          {/* Calculator + CTA (Right / Bottom) */}
          <div className="lg:col-span-5 relative">
             <div className="sticky top-24 bg-slate-900 border border-purple-500/20 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Perkiraan Biaya</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                 1 Desain = Berapa?
                 <div className="group relative">
                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-xs text-slate-300 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                      Rata-rata 1 desain butuh 40 kredit. Bisa lebih irit paket Pro/Business.
                    </div>
                 </div>
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-slate-400">Paket Starter (100 kr)</span>
                  <span className="text-white font-bold">~2 desain</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-slate-400">Paket Pro (500 kr)</span>
                  <span className="text-purple-300 font-bold">~12 desain</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-slate-400">Paket Business (2000 kr)</span>
                  <span className="text-blue-300 font-bold">~50 desain</span>
                </div>
              </div>

              <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 mb-4 text-center">
                <p className="text-sm text-slate-300 mb-1">Lebih murah dari sewa desainer?</p>
                <p className="text-lg font-bold text-white">1x desain freelancer = Rp 150.000-500.000</p>
                <p className="text-xs text-slate-400">SmartDesign: Rp 4.000-15.000 per desain</p>
              </div>

              {onJoinWaitlist && (
                <button
                  onClick={() => onJoinWaitlist("pricing_section")}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg hover:shadow-purple-500/25 flex items-center justify-center gap-2"
                >
                  <span>Daftar Gratis Dulu</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}

              <p className="text-center text-xs text-slate-400 mt-3">
                Early adopter lock harga spesial. Setelah launch, harga naik 30%.
              </p>

              <p className="text-center text-xs text-slate-500 mt-2">
                Pembayaran via QRIS, GoPay, OVO, atau transfer bank.
              </p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
