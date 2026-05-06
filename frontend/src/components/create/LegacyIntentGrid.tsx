"use client";

import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { toast } from "sonner";
import { Wand2, ImagePlus, Sparkles, Clock, Loader2 } from "lucide-react";
import { useProjectApi, type ProjectPayload } from "@/lib/api";

interface LegacyIntentGridProps {
    setCreateMode: (mode: "generate" | "redesign") => void;
    setSidebarOpen: (v: boolean) => void;
    setShowManualRef: (v: boolean) => void;
    latestProject: ProjectPayload | null;
    isLoadingProject: boolean;
}

export function LegacyIntentGrid({
    setCreateMode,
    setSidebarOpen,
    setShowManualRef,
    latestProject,
    isLoadingProject,
}: LegacyIntentGridProps) {
    const router = useRouter();
    const posthog = usePostHog();
    const { saveProject } = useProjectApi();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            <button
                onClick={() => {
                    setCreateMode("generate");
                    setSidebarOpen(true);
                }}
                className="group flex flex-col items-center text-center p-8 bg-card border shadow-sm hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 rounded-3xl transition-all"
            >
                <div className="w-20 h-20 mb-6 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Wand2 className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Buat dari Teks</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                    Deskripsikan ide visual Kamu, lalu AI meracik komposisi yang bisa Kamu lanjutkan di editor.
                </p>
            </button>

            <button
                onClick={() => {
                    setCreateMode("redesign");
                    setSidebarOpen(true);
                    setShowManualRef(true);
                }}
                className="group flex flex-col items-center text-center p-8 bg-card border shadow-sm hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 rounded-3xl transition-all"
            >
                <div className="w-20 h-20 mb-6 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <ImagePlus className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Redesign dari Foto</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                    Unggah referensi foto layout, lalu AI meniru gaya visualnya dengan kontrol perubahan yang jelas.
                </p>
            </button>

            <button
                onClick={async () => {
                    const toastId = toast.loading("Menyiapkan Studio Iklan...");
                    try {
                        const newProject = await saveProject({
                            title: "Iklan Cepat",
                            status: "draft",
                            aspect_ratio: "1:1",
                            canvas_state: {
                                elements: [],
                                backgroundUrl: null,
                                backgroundColor: "#ffffff",
                            },
                        });
                        toast.dismiss(toastId);
                        router.push(`/edit/${newProject.id}?panel=smart-ad`);
                    } catch {
                        toast.error("Gagal membuat canvas baru", { id: toastId });
                    }
                }}
                className="group flex flex-col items-center text-center p-8 bg-card border shadow-sm hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/5 rounded-3xl transition-all relative overflow-hidden"
            >
                <div className="absolute top-4 right-4 bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    Cepat
                </div>
                <div className="w-20 h-20 mb-6 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Sparkles className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Buat Iklan Cepat</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                    Ubah foto produk biasa menjadi konsep iklan yang bisa langsung diteruskan ke editor.
                </p>
            </button>

            <button
                onClick={() => {
                    if (latestProject) {
                        router.push(`/edit/${latestProject.id}`);
                    } else {
                        router.push("/projects");
                    }
                    posthog?.capture("intent_selected", { intent: "latest_project" });
                }}
                className={`group flex flex-col items-center justify-center text-center p-8 bg-card border shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 rounded-3xl transition-all ${!latestProject && !isLoadingProject ? "opacity-70" : ""}`}
            >
                <div className="w-20 h-20 mb-6 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    {isLoadingProject ? (
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    ) : (
                        <Clock className="w-10 h-10 text-blue-500" />
                    )}
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">
                    {isLoadingProject ? "Memuat..." : latestProject ? "Proyek Terakhir" : "Proyek Kosong"}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                    {isLoadingProject
                        ? "Sedang mengambil data proyek Kamu..."
                        : latestProject
                            ? `Lanjutkan edit "${latestProject.title}" yang terakhir Kamu kerjakan, tanpa perlu ke halaman Projects.`
                            : "Kamu belum memiliki proyek. Mulai dengan membuat desain baru."}
                </p>
            </button>
        </div>
    );
}
