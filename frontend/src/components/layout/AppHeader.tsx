"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Brush,
    LayoutDashboard,
    PlusCircle,
    Menu,
    X,
    Wand2,
    Palette,
    Images,
    ChevronDown,
    Sparkles,
    Eraser,
    MoveDiagonal,
    ShieldCheck,
    Layers,
    Camera,
    Workflow,
    type LucideIcon,
} from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { CreditBadge } from "@/components/credits/CreditBadge";
import { StorageBadge } from "@/components/credits/StorageBadge";

interface AppHeaderProps {
    renderActions?: () => React.ReactNode;
}

interface ToolMenuItem {
    title: string;
    href: string;
    description: string;
    Icon: LucideIcon;
    badge?: "TOP" | "BARU";
}

interface ToolSection {
    title: string;
    items: ToolMenuItem[];
}

const toolSections: ToolSection[] = [
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

const allToolItems = toolSections.flatMap((section) => section.items);

const badgeClassName: Record<NonNullable<ToolMenuItem["badge"]>, string> = {
    TOP: "bg-primary text-primary-foreground",
    BARU: "bg-emerald-500 text-white",
};

export const AppHeader = ({ renderActions }: AppHeaderProps = {}) => {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
    const closeMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isActive = (path: string) => pathname.startsWith(path) ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground";

    const openToolsMenu = () => {
        if (closeMenuTimerRef.current) {
            clearTimeout(closeMenuTimerRef.current);
            closeMenuTimerRef.current = null;
        }
        setToolsMenuOpen(true);
    };

    const scheduleCloseToolsMenu = () => {
        if (closeMenuTimerRef.current) {
            clearTimeout(closeMenuTimerRef.current);
        }
        closeMenuTimerRef.current = setTimeout(() => {
            setToolsMenuOpen(false);
            closeMenuTimerRef.current = null;
        }, 180);
    };

    useEffect(() => {
        return () => {
            if (closeMenuTimerRef.current) {
                clearTimeout(closeMenuTimerRef.current);
            }
        };
    }, []);

    return (
        <header className="h-14 border-b flex items-center justify-between px-4 md:px-6 shrink-0 z-50 bg-card shadow-sm">
            <div className="flex items-center gap-4 md:gap-6">
                <Link href="/projects" className="flex items-center gap-2 group">
                    <div className="size-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <Brush className="text-primary-foreground h-5 w-5" />
                    </div>
                    <h1 className="font-jakarta font-bold text-lg hidden sm:block">SmartDesign</h1>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
                    <Link href="/create" className={`flex items-center gap-1.5 transition-colors ${isActive('/create')}`}>
                        <PlusCircle className="w-4 h-4" />
                        <span>Buat</span>
                    </Link>
                    <Link href="/projects" className={`flex items-center gap-1.5 transition-colors ${isActive('/projects')}`}>
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Proyek</span>
                    </Link>
                    <Link href="/brand" className={`flex items-center gap-1.5 transition-colors ${isActive('/brand')}`}>
                        <Palette className="w-4 h-4" />
                        <span>Brand Kit</span>
                    </Link>
                    <div
                        className="relative"
                        onMouseEnter={openToolsMenu}
                        onMouseLeave={scheduleCloseToolsMenu}
                    >
                        <button
                            type="button"
                            className={`flex items-center gap-1.5 transition-colors ${isActive('/tools')}`}
                            aria-haspopup="menu"
                            aria-expanded={toolsMenuOpen}
                            onClick={() => setToolsMenuOpen((current) => !current)}
                        >
                            <Wand2 className="w-4 h-4" />
                            <span>AI Tools</span>
                            <ChevronDown
                                className={`w-3.5 h-3.5 text-muted-foreground transition-all duration-200 ${toolsMenuOpen ? "text-foreground rotate-180" : ""}`}
                            />
                        </button>

                        <div
                            className={`absolute left-0 top-full pt-3 transition-all duration-200 z-50 ${toolsMenuOpen ? "opacity-100 visible translate-y-0 pointer-events-auto" : "opacity-0 invisible translate-y-1 pointer-events-none"}`}
                        >
                            <div className="w-[760px] rounded-2xl border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 shadow-2xl p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {toolSections.map((section) => (
                                        <div key={section.title} className="min-w-0">
                                            <p className="px-2 pb-2 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground">
                                                {section.title}
                                            </p>
                                            <div className="space-y-1">
                                                {section.items.map((item) => (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        className="flex items-start gap-3 rounded-xl px-2.5 py-2.5 hover:bg-muted/70 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                                                            <item.Icon className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-semibold leading-tight text-foreground">
                                                                    {item.title}
                                                                </p>
                                                                {item.badge ? (
                                                                    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-bold leading-none ${badgeClassName[item.badge]}`}>
                                                                        {item.badge}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                                                                {item.description}
                                                            </p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <Link href="/my-assets" className={`flex items-center gap-1.5 transition-colors ${isActive('/my-assets')}`}>
                        <Images className="w-4 h-4" />
                        <span>Aset</span>
                    </Link>
                </nav>
            </div>

            <div className="flex items-center gap-3">
                {renderActions ? renderActions() : null}
                <div className="hidden sm:block"><StorageBadge /></div>
                <CreditBadge />
                <UserMenu />

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
                    aria-expanded={mobileMenuOpen}
                >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div className="absolute top-14 left-0 right-0 bg-card border-b shadow-lg z-40 md:hidden animate-in slide-in-from-top-2 duration-200">
                    <nav className="flex flex-col p-3 gap-1">
                        <Link
                            href="/create"
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/create')} hover:bg-muted`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <PlusCircle className="w-4 h-4" />
                            Buat
                        </Link>
                        <Link
                            href="/projects"
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/projects')} hover:bg-muted`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Proyek
                        </Link>
                        <Link
                            href="/brand"
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/brand')} hover:bg-muted`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Palette className="w-4 h-4" />
                            Brand Kit
                        </Link>
                        <div className="px-3 pt-1 pb-1">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                                <Wand2 className="w-3.5 h-3.5" />
                                AI Tools
                            </div>
                        </div>
                        {allToolItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/tools')} hover:bg-muted`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <span className="flex items-center gap-2">
                                    <item.Icon className="w-4 h-4" />
                                    {item.title}
                                </span>
                                {item.badge ? (
                                    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] uppercase tracking-wider font-bold leading-none ${badgeClassName[item.badge]}`}>
                                        {item.badge}
                                    </span>
                                ) : null}
                            </Link>
                        ))}
                        <Link
                            href="/my-assets"
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/my-assets')} hover:bg-muted`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Images className="w-4 h-4" />
                            Aset
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
};
