"use client";

import { Sparkles, Trash2, Maximize, Crop, Layers, Paintbrush, Stamp, MoveHorizontal } from "lucide-react";

const capabilities = [
  { name: "Penghapus Latar", icon: Trash2 },
  { name: "Peningkat Resolusi Gambar", icon: Maximize },
  { name: "AI Retouch", icon: Paintbrush },
  { name: "Scene Generator", icon: Layers },
  { name: "Proses Batch", icon: Layers },
  { name: "Pembuat Pas Foto", icon: Crop },
  { name: "Watermark Otomatis", icon: Stamp },
  { name: "Magic Eraser", icon: Sparkles },
  { name: "Product Scene", icon: Layers },
  { name: "Resize Otomatis Media Sosial", icon: MoveHorizontal },
  { name: "Pas Foto / Foto KTP", icon: Crop },
];

export function CapabilityMarquee() {
  return (
    <div className="w-full bg-slate-900/50 border-y border-white/5 py-6 overflow-hidden relative flex">
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-24 bg-gradient-to-r from-slate-950 to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-24 bg-gradient-to-l from-slate-950 to-transparent z-10"></div>
      
      <div className="flex animate-scroll w-max items-center gap-12 px-6">
        {[...capabilities, ...capabilities].map((cap, i) => (
          <div key={i} className="flex items-center gap-3 text-slate-400 whitespace-nowrap">
            <cap.icon className="w-5 h-5 text-purple-400" />
            <span className="font-medium">{cap.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
