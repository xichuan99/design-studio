import {
    Camera,
    Eraser,
    Layers,
    MoveDiagonal,
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
            { title: "AI Background Swap", href: "/tools/background-swap", description: "Ganti background produk jadi studio.", Icon: Wand2, badge: "TOP" },
            { title: "Quick Retouch", href: "/tools/retouch", description: "Cerahkan dan bersihkan foto otomatis.", Icon: Sparkles },
            { title: "Magic Eraser", href: "/tools/magic-eraser", description: "Hapus objek mengganggu dari foto.", Icon: Eraser },
            { title: "Generative Expand", href: "/tools/generative-expand", description: "Perluas kanvas foto untuk banner.", Icon: MoveDiagonal, badge: "BARU" },
            { title: "AI Watermark Placer", href: "/tools/watermark-placer", description: "Pasang watermark ke banyak foto.", Icon: ShieldCheck },
        ],
    },
    {
        title: "Alat Canggih",
        items: [
            { title: "AI Product Scene", href: "/tools/product-scene", description: "Ubah foto ke scene produk siap jual.", Icon: Sparkles, badge: "TOP" },
            { title: "Batch Photo Processor", href: "/tools/batch-process", description: "Proses puluhan foto sekaligus.", Icon: Layers },
            { title: "ID Photo Maker", href: "/tools/id-photo", description: "Buat pas foto dari selfie.", Icon: Camera },
            { title: "AI Transform Pipeline", href: "/tools/transform", description: "Gabungkan beberapa proses AI dalam alur.", Icon: Workflow, badge: "BARU" },
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