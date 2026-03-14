"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brush, LayoutDashboard, PlusCircle, Menu, X, Wand2, Palette } from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { CreditBadge } from "@/components/credits/CreditBadge";

interface AppHeaderProps {
    renderActions?: () => React.ReactNode;
}

export const AppHeader = ({ renderActions }: AppHeaderProps = {}) => {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isActive = (path: string) => pathname.startsWith(path) ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground";

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
                        <span>Buat Desain</span>
                    </Link>
                    <Link href="/projects" className={`flex items-center gap-1.5 transition-colors ${isActive('/projects')}`}>
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Desain Saya</span>
                    </Link>
                    <Link href="/brand" className={`flex items-center gap-1.5 transition-colors ${isActive('/brand')}`}>
                        <Palette className="w-4 h-4" />
                        <span>Brand Kit</span>
                    </Link>
                    <Link href="/tools" className={`flex items-center gap-1.5 transition-colors ${isActive('/tools')}`}>
                        <Wand2 className="w-4 h-4" />
                        <span>AI Tools</span>
                    </Link>
                </nav>
            </div>

            <div className="flex items-center gap-3">
                {renderActions ? renderActions() : null}
                <CreditBadge />
                <UserMenu />

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-1.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
                            Buat Desain
                        </Link>
                        <Link
                            href="/projects"
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/projects')} hover:bg-muted`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Desain Saya
                        </Link>
                        <Link
                            href="/brand"
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/brand')} hover:bg-muted`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Palette className="w-4 h-4" />
                            Brand Kit
                        </Link>
                        <Link
                            href="/tools"
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/tools')} hover:bg-muted`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            <Wand2 className="w-4 h-4" />
                            AI Tools
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
};
