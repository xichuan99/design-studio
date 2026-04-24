import { AppHeader } from "@/components/layout/AppHeader";
import { Wand2, Eraser, MoveDiagonal, Sparkles, Camera, ShieldCheck, Layers, Images, Workflow } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Badge = { label: string; variant: "top" | "new" | "coming-soon" };

interface Tool {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  href: string;
  isReady: boolean;
  badge?: Badge;
}

const quickTools: Tool[] = [
  {
    title: "AI Background Swap",
    description: "Ganti background foto produk jadi studio profesional — cocok untuk Shopee & Tokopedia.",
    icon: <Wand2 className="w-5 h-5" />,
    iconBg: "bg-blue-500/20 text-blue-400",
    href: "/tools/background-swap",
    isReady: true,
    badge: { label: "POPULER", variant: "top" },
  },
  {
    title: "Quick Retouch",
    description: "Foto kurang terang atau ada noda? Cerahkan dan bersihkan otomatis, hasilnya natural.",
    icon: <Sparkles className="w-5 h-5" />,
    iconBg: "bg-yellow-500/20 text-yellow-400",
    href: "/tools/retouch",
    isReady: true,
  },
  {
    title: "Magic Eraser",
    description: "Ada tangan orang nyangkut di foto produk? Hapus bersih tanpa bekas — cukup usap saja.",
    icon: <Eraser className="w-5 h-5" />,
    iconBg: "bg-pink-500/20 text-pink-400",
    href: "/tools/magic-eraser",
    isReady: true,
  },
  {
    title: "Generative Expand",
    description: "Foto terlalu sempit untuk banner? Perluas sisi foto tanpa kehilangan objek utama.",
    icon: <MoveDiagonal className="w-5 h-5" />,
    iconBg: "bg-indigo-500/20 text-indigo-400",
    href: "/tools/generative-expand",
    isReady: true,
    badge: { label: "BARU", variant: "new" },
  },
  {
    title: "AI Watermark Placer",
    description: "Tempelkan logo atau nama toko di semua foto produk secara otomatis — anti dicuri kompetitor.",
    icon: <ShieldCheck className="w-5 h-5" />,
    iconBg: "bg-orange-500/20 text-orange-400",
    href: "/tools/watermark-placer",
    isReady: true,
  },
];

const advancedTools: Tool[] = [
  {
    title: "AI Product Scene",
    description: "Ubah foto produk biasa jadi tampil di meja kafe, studio, atau taman — tanpa pemotretan ulang.",
    icon: <Sparkles className="w-5 h-5" />,
    iconBg: "bg-amber-500/20 text-amber-400",
    href: "/tools/product-scene",
    isReady: true,
    badge: { label: "POPULER", variant: "top" },
  },
  {
    title: "Batch Photo Processor",
    description: "Punya 50 foto produk? Upload semuanya — background bersih dan watermark terpasang otomatis.",
    icon: <Layers className="w-5 h-5" />,
    iconBg: "bg-indigo-500/20 text-indigo-400",
    href: "/tools/batch-process",
    isReady: true,
  },
  {
    title: "ID Photo Maker",
    description: "Buat pasfoto untuk keperluan resmi (KTP, ijazah, CV, visa) langsung dari foto selfie.",
    icon: <Camera className="w-5 h-5" />,
    iconBg: "bg-blue-500/20 text-blue-400",
    href: "/tools/id-photo",
    isReady: true,
  },
  {
    title: "AI Transform Pipeline",
    description: "Gabungkan remove background, generate background, dan watermark dalam satu alur kerja.",
    icon: <Workflow className="w-5 h-5" />,
    iconBg: "bg-teal-500/20 text-teal-400",
    href: "/tools/transform",
    isReady: true,
    badge: { label: "BARU", variant: "new" },
  },
];

function BadgeChip({ badge }: { badge: Badge }) {
  if (badge.variant === "top") {
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm leading-none">
        TOP
      </span>
    );
  }
  if (badge.variant === "new") {
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500 text-white px-1.5 py-0.5 rounded-sm leading-none">
        BARU
      </span>
    );
  }
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm leading-none">
      SOON
    </span>
  );
}

function ToolItem({ tool }: { tool: Tool }) {
  const inner = (
    <div
      className={cn(
        "flex items-start gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-150",
        tool.isReady
          ? "hover:bg-muted/60 cursor-pointer group"
          : "opacity-40 pointer-events-none select-none"
      )}
    >
      <div className={cn("flex-shrink-0 mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center", tool.iconBg)}>
        {tool.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors leading-snug">
            {tool.title}
          </span>
          {tool.badge && <BadgeChip badge={tool.badge} />}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{tool.description}</p>
      </div>
    </div>
  );

  if (!tool.isReady) return <div>{inner}</div>;
  return <Link href={tool.href}>{inner}</Link>;
}

function ToolColumn({ title, tools }: { title: string; tools: Tool[] }) {
  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-4 mb-1">{title}</p>
      <div className="divide-y divide-border/40">
        {tools.map((tool, idx) => (
          <ToolItem key={idx} tool={tool} />
        ))}
      </div>
    </div>
  );
}

export default function ToolsHubPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-5xl mx-auto p-6 md:p-8 w-full">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-jakarta font-bold text-foreground">AI Photo Tools</h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
            Alat cepat untuk membersihkan, memperbaiki, dan menyiapkan aset sebelum lanjut ke editor.
          </p>
        </div>

        <div className="border border-border/60 rounded-2xl overflow-hidden bg-card">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
            <div className="py-4">
              <ToolColumn title="Alat Cepat" tools={quickTools} />
            </div>
            <div className="py-4">
              <ToolColumn title="Alat Canggih" tools={advancedTools} />
            </div>
          </div>
        </div>

        <div className="mt-6 mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Semua hasil AI Tools tersimpan otomatis dan siap dibuka dari editor.
          </p>
          <Link
            href="/my-assets"
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            <Images className="w-3.5 h-3.5" />
            Lihat Aset Saya →
          </Link>
        </div>
      </div>
    </div>
  );
}
