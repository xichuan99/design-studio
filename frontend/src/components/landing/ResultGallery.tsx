"use client";

import { useState } from "react";
import { Sparkles, Image as ImageIcon, LayoutTemplate, Layers } from "lucide-react";
import Image from "next/image";

// Sample data for the gallery (Output-only)
const galleryItems = [
  {
    id: 1,
    category: "Foto Produk",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop",
    title: "Sepatu Sport Neo",
    tags: ["AI Background", "Studio Lighting"],
    aspectRatio: "aspect-square"
  },
  {
    id: 2,
    category: "Banner Promo",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop",
    title: "Flash Sale 50%",
    tags: ["Template Banner", "AI Text"],
    aspectRatio: "aspect-[16/9]"
  },
  {
    id: 3,
    category: "Sosmed",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop",
    title: "Instagram Feed",
    tags: ["Magic Eraser", "Template Sosmed"],
    aspectRatio: "aspect-[4/5]"
  },
  {
    id: 4,
    category: "Foto Produk",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop",
    title: "Headphone Premium",
    tags: ["Scene Generator", "Shadow AI"],
    aspectRatio: "aspect-square"
  },
  {
    id: 5,
    category: "Sosmed",
    image: "https://images.unsplash.com/photo-1600096194534-75cf5ead4111?q=80&w=600&auto=format&fit=crop",
    title: "TikTok Story Highlight",
    tags: ["Template Story", "Upscale 4K"],
    aspectRatio: "aspect-[9/16]"
  },
  {
    id: 6,
    category: "Banner Promo",
    image: "https://images.unsplash.com/photo-1555529771-835f59bfc50c?q=80&w=800&auto=format&fit=crop",
    title: "Promo Restoran",
    tags: ["Food Preset", "Template Menu"],
    aspectRatio: "aspect-square"
  }
];

const categories = ["Semua", "Foto Produk", "Banner Promo", "Sosmed"];

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
          Dari foto katalog sederhana hingga banner promo siap tayang. Lihat berbagai karya yang dihasilkan pengguna kami dengan bantuan AI & ribuan template.
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
            {cat === "Foto Produk" && <ImageIcon className="w-4 h-4" />}
            {cat === "Banner Promo" && <LayoutTemplate className="w-4 h-4" />}
            {cat === "Sosmed" && <Sparkles className="w-4 h-4" />}
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
