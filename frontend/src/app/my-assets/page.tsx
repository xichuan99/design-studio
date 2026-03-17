import { AppHeader } from "@/components/layout/AppHeader";
import { AssetGrid } from "@/components/assets/AssetGrid";
import { Images } from "lucide-react";

export const metadata = {
    title: "Aset AI Saya — SmartDesign",
    description: "Kelola semua hasil AI Tools Anda: background swap, upscale, retouch, dan lainnya.",
};

export default function MyAssetsPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AppHeader />
            <div className="flex-1 max-w-6xl mx-auto p-6 md:p-8 w-full">
                {/* Header */}
                <div className="mb-8">
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

                <AssetGrid />
            </div>
        </div>
    );
}
