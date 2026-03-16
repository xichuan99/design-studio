"use client";

import { useState } from "react";
import { Check, Star, Info } from "lucide-react";

export function PricingSection() {
  const [creditsSelected, setCreditsSelected] = useState(500); // Default to popular tier

  return (
    <div className="w-full py-24 relative" id="pricing">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Harga Kredit</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mt-4 mb-6">Bayar Sesuai Kebutuhan</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Tidak ada biaya langganan bulanan yang hangus. Beli kredit hanya saat Anda butuh mengedit katalog produk. <strong className="text-white">1 Kredit = 1x Proses AI.</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Credit Packages (Left / Top) */}
          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-6">
            
            {/* Starter */}
            <div 
              className={`p-6 rounded-3xl border transition-all cursor-pointer ${
                creditsSelected === 100 ? "bg-white/10 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]" : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
              onClick={() => setCreditsSelected(100)}
            >
              <div className="text-slate-400 font-medium mb-2">Paket Starter</div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-white">Rp 15.000</span>
              </div>
              <div className="flex items-center gap-2 mb-6 p-2 rounded-lg bg-black/30">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className="font-bold text-white text-lg">100 Kredit</span>
              </div>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-2"><Check className="w-4 h-4 text-green-400 shrink-0" /> Termasuk daily claim (10 kr/hari)</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-green-400 shrink-0" /> Akses semua tools AI</li>
              </ul>
            </div>

            {/* Popular */}
            <div 
              className={`p-6 rounded-3xl border relative transition-all cursor-pointer ${
                creditsSelected === 500 ? "bg-purple-900/20 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]" : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
              onClick={() => setCreditsSelected(500)}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                Paling Populer
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
                <li className="flex gap-2"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Hemat 33%</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-purple-400 shrink-0" /> Ideal untuk toko skala menengah</li>
              </ul>
            </div>

             {/* Business */}
             <div 
              className={`p-6 rounded-3xl border transition-all cursor-pointer sm:col-span-2 ${
                creditsSelected === 2000 ? "bg-white/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]" : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
              onClick={() => setCreditsSelected(2000)}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-slate-400 font-medium mb-1">Paket Business</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">Rp 150.000</span>
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded font-bold">Hemat 50%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-black/30 border border-white/10 w-full sm:w-auto justify-center">
                  <Star className="w-6 h-6 text-yellow-500 fill-current" />
                  <span className="font-bold text-white text-xl">2000 Kredit</span>
                </div>
              </div>
            </div>

          </div>

          {/* Calculator (Right / Bottom) */}
          <div className="lg:col-span-5 relative">
             <div className="sticky top-24 bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                 Simulasi Penggunaan
                 <div className="group relative">
                    <Info className="w-4 h-4 text-slate-400 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-xs text-slate-300 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                      Asumsi 1 desain butuh 40 kredit (contoh: Generate AI)
                    </div>
                 </div>
              </h3>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-slate-400">Total Kredit</span>
                  <span className="text-2xl font-bold text-purple-400">{creditsSelected}</span>
                </div>
                
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-slate-400">Harga per Edit</span>
                  <span className="text-white font-medium">
                    Rp {Math.round((creditsSelected === 100 ? 15000 : creditsSelected === 500 ? 50000 : 150000) / (creditsSelected / 40))}
                  </span>
                </div>

                <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-sm text-slate-300">Cukup untuk membuat sekitar:</span>
                  <div className="text-3xl font-black text-white">
                    {Math.floor(creditsSelected / 40)} <span className="text-xl font-bold text-slate-400">Desain (Full AI)</span>
                  </div>
                </div>

                <button className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg hover:shadow-purple-500/25 mt-4">
                  Beli Paket Ini
                </button>
                
                <p className="text-center text-xs text-slate-500">
                  Pembayaran aman via QRIS, GoPay, OVO, atau Transfer Bank.
                </p>
              </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
