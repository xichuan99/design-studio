"use client";

import { useState } from "react";
import { Sparkles, Image as ImageIcon, LayoutTemplate, Layers } from "lucide-react";
import Image from "next/image";

// Sample data for the gallery (Output-only)
const galleryItems = [
  {
    id: 1,
    category: "Makanan & Minuman",
    image: "/images/showcase/sate_ayam.png", 
    title: "Sate Ayam Nusantara",
    tags: ["Background Remover", "Color Enhance"],
    aspectRatio: "aspect-square"
  },
  {
    id: 2,
    category: "Fashion",
    image: "/images/showcase/batik_model.png", 
    title: "Kemeja Batik Modern",
    tags: ["Product Scene", "AI Shadows"],
    aspectRatio: "aspect-[16/9]"
  },
  {
    id: 3,
    category: "Aksesoris & Lainnya",
    image: "/images/showcase/tas_anyaman.png", 
    title: "Tas Anyaman Bali",
    tags: ["Magic Eraser", "Upscale 4K"],
    aspectRatio: "aspect-[4/5]"
  },
  {
    id: 4,
    category: "Makanan & Minuman",
    image: "/images/showcase/es_kopi_susu.png", 
    title: "Es Kopi Susu Aren",
    tags: ["Scene Generator", "Retouch"],
    aspectRatio: "aspect-square"
  },
  {
    id: 5,
    category: "Fashion",
    image: "/images/showcase/hijab_fashion.png", 
    title: "Katalog Hijab & Tunik",
    tags: ["Auto-Resize", "Background Eraser"],
    aspectRatio: "aspect-[9/16]"
  },
  {
    id: 6,
    category: "Aksesoris & Lainnya",
    image: "/images/showcase/skincare_alami.png",
    title: "Skincare Alami",
    tags: ["Studio Lighting AI", "Batch Process"],
    aspectRatio: "aspect-square"
  }
];

const categories = ["Semua", "Makanan & Minuman", "Fashion", "Aksesoris & Lainnya"];

export function ResultGallery() {
  const [activeCategory, setActiveCategory] = useState("Semua");

  const filteredItems = activeCategory === "Semua" 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeCategory);

  return (
    <div className="w-full py-16 flex flex-col items-center">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Showcase Portofolio UMKM</h2>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Lihat inspirasi bagaimana UMKM Indonesia mengolah foto produk dengan bantuan AI agar lebih siap untuk katalog dan materi promo.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              activeCategory === cat 
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(108,43,238,0.4)]" 
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            {cat === "Semua" && <Layers className="w-4 h-4" />}
            {cat === "Makanan & Minuman" && <ImageIcon className="w-4 h-4" />}
            {cat === "Fashion" && <LayoutTemplate className="w-4 h-4" />}
            {cat === "Aksesoris & Lainnya" && <Sparkles className="w-4 h-4" />}
            {cat}
          </button>
        ))}
      </div>

      {/* Masonry-style Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 w-full max-w-6xl px-4 space-y-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="relative group rounded-3xl overflow-hidden border border-white/10 bg-slate-900 break-inside-avoid">
            <div className={`w-full ${item.aspectRatio} relative overflow-hidden bg-slate-800`}>
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            
            {/* Hover Info */}
            <div className="absolute bottom-0 left-0 w-full p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <h3 className="text-white font-bold text-xl mb-2">{item.title}</h3>
              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag, idx) => (
                  <span key={idx} className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
