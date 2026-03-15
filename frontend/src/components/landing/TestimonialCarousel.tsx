"use client";

import { useEffect, useState, useRef } from "react";
import { Star } from "lucide-react";

// Placeholder data - to be replaced with real user quotes later
const testimonials = [
  {
    quote: "Penjualan saya naik 40% setelah ganti foto produk pakai SmartDesign. Sebelumnya foto produk saya jelek, sekarang terlihat profesional.",
    name: "Rina",
    role: "Pemilik Toko Aksesori, Tokopedia",
    initials: "RN",
    color: "bg-purple-500"
  },
  {
    quote: "Sangat menghemat biaya operasional. Saya tidak perlu lagi bayar jasa edit foto mingguan untuk upload katalog baru di Shopee.",
    name: "Budi Santoso",
    role: "Seller Pakaian Pria, Shopee",
    initials: "BS",
    color: "bg-blue-500"
  },
  {
    quote: "Fitur hapus background-nya sangat rapi, bahkan untuk produk yang bentuknya rumit. Proses 50 foto sekaligus sangat membantu waktu admin saya.",
    name: "Siti Aminah",
    role: "Penjual Makanan Kering, TikTok Shop",
    initials: "SA",
    color: "bg-emerald-500"
  },
  {
    quote: "Kredit sistem ini sangat cocok untuk UMKM pemula seperti saya. Beli hanya pas lagi butuh edit katalog, tidak terikat langganan bulanan yang mahal.",
    name: "Dian Wahyu",
    role: "Toko Sepatu Lokal",
    initials: "DW",
    color: "bg-amber-500"
  }
];

export function TestimonialCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-scroll logic
  useEffect(() => {
    if (isHovered) return;
    
    const interval = setInterval(() => {
      if (scrollRef.current) {
        // Scroll right by 2px every 20ms
        scrollRef.current.scrollLeft += 1;
        
        // Reset to start if reached the end (approximate)
        if (scrollRef.current.scrollLeft >= scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 5) {
          scrollRef.current.scrollLeft = 0;
        }
      }
    }, 20);

    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <div className="w-full py-12 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none"></div>
      <div className="absolute right-0 top-0 bottom-0 w-12 md:w-32 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none"></div>
      
      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-8 pt-4 px-6 md:px-32 hide-scrollbar scroll-smooth"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Double the array for infinite scrolling effect visually if the user scrolls manually */}
        {[...testimonials, ...testimonials].map((t, i) => (
          <div 
            key={i} 
            className="flex-none w-[320px] md:w-[400px] bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col gap-6 hover:bg-white/10 transition-colors duration-300 transform hover:-translate-y-1"
          >
            <div className="flex gap-1 text-yellow-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-4 h-4 fill-current" />
              ))}
            </div>
            
            <p className="text-slate-300 leading-relaxed italic flex-1">
              &quot;{t.quote}&quot;
            </p>
            
            <div className="flex items-center gap-4 mt-auto">
              <div className={`w-12 h-12 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                {t.initials}
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{t.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
