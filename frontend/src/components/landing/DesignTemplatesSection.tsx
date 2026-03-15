"use client";

import { ArrowRight, LayoutTemplate, Palette, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export function DesignTemplatesSection() {
  const router = useRouter();
  
  return (
    <div className="w-full py-24 relative overflow-hidden" id="templates">
      {/* Background Decor */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          {/* Content Left */}
          <div className="flex-1 space-y-8">
            <div>
              <span className="text-blue-400 font-semibold tracking-wider uppercase text-sm flex items-center gap-2 mb-4">
                <LayoutTemplate className="w-4 h-4" /> Desain Grafis Otomatis
              </span>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white mb-6">
                Bukan Cuma Edit Foto. <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Buat Desain Promosi Instan.
                </span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                SmartDesign Studio dilengkapi dengan Canvas Editor tangguh. Ubah foto produk yang baru saja Anda edit langsung menjadi materi promosi siap posting.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="bg-blue-500/20 p-2 rounded-lg mt-1 shrink-0">
                  <LayoutTemplate className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">25+ Template Konversi Tinggi</h4>
                  <p className="text-slate-400 text-sm mt-1">Pilih dari puluhan template Banner Toko, Instagram Feed, Story, hingga Menu Makanan yang dirancang khusus untuk UMKM.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-purple-500/20 p-2 rounded-lg mt-1 shrink-0">
                  <Type className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Kustomisasi Teks & Font</h4>
                  <p className="text-slate-400 text-sm mt-1">Tambahkan harga promo, detail produk, atau tagline bisnis Anda. Lengkap dengan koleksi font modern.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-pink-500/20 p-2 rounded-lg mt-1 shrink-0">
                  <Palette className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg">Auto-Branding</h4>
                  <p className="text-slate-400 text-sm mt-1">Upload logo toko Anda sekali, dan sistem akan mengaplikasikannya secara konsisten ke setiap desain yang Anda buat.</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 rounded-xl h-14 px-8 bg-white/5 border border-white/10 text-white text-lg font-medium hover:bg-white/10 transition-colors group"
            >
              <span>Jelajahi Semua Template</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Image/Mockup Right */}
          <div className="flex-1 w-full relative">
             <div className="relative aspect-[4/3] w-full max-w-lg mx-auto lg:ml-auto perspective-1000">
                {/* Mockup Back */}
                <div className="absolute top-10 -right-4 w-[80%] aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl rotate-6 hover:rotate-2 transition-transform duration-500 z-0 opacity-60">
                   <Image src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=600&auto=format&fit=crop" width={600} height={600} alt="Instagram Post Template" className="w-full h-full object-cover" />
                </div>
                
                {/* Mockup Middle */}
                <div className="absolute top-5 left-0 w-[70%] aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 shadow-2xl -rotate-6 hover:-rotate-2 transition-transform duration-500 z-10 opacity-80">
                   <Image src="https://images.unsplash.com/photo-1600096194534-75cf5ead4111?q=80&w=400&auto=format&fit=crop" width={400} height={711} alt="Instagram Story Template" className="w-full h-full object-cover" />
                </div>

                {/* Mockup Front */}
                <div className="absolute bottom-[-10%] right-[10%] w-[90%] aspect-[16/9] rounded-2xl overflow-hidden border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 hover:scale-105 transition-transform duration-500 bg-slate-900 flex items-center justify-center group cursor-pointer" onClick={() => router.push("/login")}>
                   <Image src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop" width={800} height={450} alt="Promo Banner Template" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors flex items-center justify-center">
                      <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">
                        Lihat Banner Shopee
                      </div>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
