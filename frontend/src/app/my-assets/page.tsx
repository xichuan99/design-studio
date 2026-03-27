"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AssetGrid } from "@/components/assets/AssetGrid";
import { Images, Loader2 } from "lucide-react";
import { FolderSidebar } from "@/components/projects/FolderSidebar";

export default function MyAssetsPage() {
    const { status } = useSession();
    const router = useRouter();
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Memuat Aset...</p>
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AppHeader />
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Workspace */}
                <div className="hidden md:block w-64 border-r border-border/50 shrink-0">
                    <FolderSidebar
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={setSelectedFolderId}
                    />
                </div>
            
                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="max-w-6xl mx-auto space-y-8">
                        {/* Header */}
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Images className="w-5 h-5 text-primary" />
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-jakarta font-bold text-foreground">
                                    Aset AI Saya
                                </h1>
                            </div>
                            <p className="text-muted-foreground text-sm sm:text-base ml-[52px]">
                                Semua hasil dari AI Tools Anda tersimpan di sini. Filter, download, atau hapus untuk mengosongkan kuota storage.
                            </p>
                        </div>

                        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>}>
                            <AssetGrid selectedFolderId={selectedFolderId} />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
