import {
    Camera,
    Eraser,
    Layers,
    ShieldCheck,
    Sparkles,
    Wand2,
    Workflow,
    type LucideIcon,
} from "lucide-react";

export interface ToolMenuItem {
    title: string;
    href: string;
    description: string;
    Icon: LucideIcon;
    badge?: "TOP" | "BARU";
}

export interface ToolSection {
    title: string;
    items: ToolMenuItem[];
}

export const toolSections: ToolSection[] = [
    {
        title: "Alat Cepat",
        items: [
            { title: "Ganti Latar Foto", href: "/tools/background-swap", description: "Ganti latar produk menjadi gaya studio.", Icon: Wand2, badge: "TOP" },
            { title: "Percantik Foto", href: "/tools/retouch", description: "Cerahkan dan bersihkan foto otomatis.", Icon: Sparkles },
            { title: "Hapus Objek", href: "/tools/magic-eraser", description: "Hapus objek mengganggu dari foto.", Icon: Eraser },
            { title: "Pasang Logo / Watermark", href: "/tools/watermark-placer", description: "Pasang watermark ke banyak foto.", Icon: ShieldCheck },
        ],
    },
    {
        title: "Fitur Spesial",
        items: [
            { title: "Ubah Suasana Foto", href: "/tools/product-scene", description: "Ubah suasana foto agar siap jual.", Icon: Sparkles, badge: "TOP" },
            { title: "Proses Katalog Foto", href: "/tools/batch-process", description: "Proses puluhan foto sekaligus dalam sekejap.", Icon: Layers },
            { title: "Buat Pas Foto", href: "/tools/id-photo", description: "Buat pas foto dari selfie secara otomatis.", Icon: Camera },
            { title: "Edit Otomatis (Pro)", href: "/tools/transform", description: "Gabungkan beberapa proses edit dalam satu alur.", Icon: Workflow, badge: "BARU" },
        ],
    },
];

export const allToolItems = toolSections.flatMap((section) => section.items);

export const featuredToolItems = [
    toolSections[0].items[0],
    toolSections[1].items[0],
    toolSections[1].items[1],
    toolSections[0].items[1],
];

export const badgeClassName: Record<NonNullable<ToolMenuItem["badge"]>, string> = {
    TOP: "bg-primary text-primary-foreground",
    BARU: "bg-emerald-500 text-white",
};