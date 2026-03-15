"use client";

import { useState } from "react";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

// Sample data for the gallery
const galleryItems = [
  {
    id: 1,
    category: "Produk",
    before: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
    after: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    time: "24 detik"
  },
  {
    id: 2,
    category: "Makanan",
    before: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=600&auto=format&fit=crop",
    after: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=600&auto=format&fit=crop",
    time: "18 detik"
  },
  {
    id: 3,
    category: "Fashion",
    before: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop",
    after: "https://images.unsplash.com/photo-1550614000-4b953a6eb851?q=80&w=600&auto=format&fit=crop",
    time: "32 detik"
  },
  {
    id: 4,
    category: "Produk",
    before: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop",
    after: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop", // Reusing for placeholder
    time: "15 detik"
  }
];

const categories = ["Semua", "Produk", "Makanan", "Fashion"];

export function ResultGallery() {
  const [activeCategory, setActiveCategory] = useState("Semua");

  const filteredItems = activeCategory === "Semua" 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeCategory);

  return (
    <div className="w-full py-16 flex flex-col items-center">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Hasil Nyata dari Pengguna</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Lihat transformasi instan yang dihasilkan oleh teknologi AI kami untuk berbagai jenis produk.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat 
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(108,43,238,0.4)]" 
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Masonry Grid (Simulated with columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 w-full max-w-5xl px-4">
        {filteredItems.map((item) => (
          <div key={item.id} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <BeforeAfterSlider 
              beforeImage={item.before} 
              afterImage={item.after} 
              className="w-full aspect-square"
            />
            {/* Overlay Info */}
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-xs text-white font-medium flex items-center gap-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Diproses dalam {item.time}
            </div>
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-purple-300 font-semibold z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
              {item.category}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
