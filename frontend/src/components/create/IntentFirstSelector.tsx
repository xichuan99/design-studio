"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { toast } from "sonner";
import { Sparkles, Scissors, Wand2, PanelsTopLeft, ChevronDown } from "lucide-react";
import { useProjectApi } from "@/lib/api";
import type { UserIntent } from "@/app/create/types";

interface IntentFirstSelectorProps {
    setUserIntent: (intent: UserIntent) => void;
    setCreateMode: (mode: "generate" | "redesign") => void;
    setSidebarOpen: (v: boolean) => void;
    setShowManualRef: (v: boolean) => void;
}

export function IntentFirstSelector({
    setUserIntent,
    setCreateMode,
    setSidebarOpen,
    setShowManualRef,
}: IntentFirstSelectorProps) {
    const router = useRouter();
    const posthog = usePostHog();
    const { saveProject } = useProjectApi();
    const [showExtendedCreateOptions, setShowExtendedCreateOptions] = useState(false);

    return (
        <div className="w-full max-w-5xl space-y-5">
            <button
                onClick={() => {
                    setUserIntent("ad_from_photo");
                    setCreateMode("redesign");
                    setSidebarOpen(true);
                    setShowManualRef(true);
                    posthog?.capture("intent_selected", { intent: "ad_from_photo" });
                }}
                className="group w-full flex items-center justify-between text-left p-6 md:p-7 bg-card border shadow-sm hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 rounded-3xl transition-all"
            >
                <div className="max-w-xl">
                    <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary mb-3">
                        Direkomendasikan
                    </span>
                    <h3 className="text-2xl font-bold mb-2 text-foreground">Buat Iklan dari Foto</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                        Upload foto produk, lalu lanjutkan ke konsep visual siap edit.
                    </p>
                </div>
                <div className="hidden md:flex w-20 h-20 rounded-2xl bg-primary/10 items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Sparkles className="w-10 h-10 text-primary" />
                </div>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={async () => {
                        setUserIntent("clean_photo");
                        const toastId = toast.loading("Membuka Studio...");
                        try {
                            const newProject = await saveProject({
                                title: "Rapikan Foto",
                                status: "draft",
                                aspect_ratio: "1:1",
                                canvas_state: {
                                    elements: [],
                                    backgroundUrl: null,
                                    backgroundColor: "#ffffff",
                                },
                            });
                            toast.dismiss(toastId);
                            posthog?.capture("intent_selected", { intent: "clean_photo" });
                            router.push(`/edit/${newProject.id}?panel=bgremoval`);
                        } catch {
                            toast.error("Gagal membuka studio", { id: toastId });
                        }
                    }}
                    className="group flex items-start gap-3 text-left p-4 bg-card border shadow-sm hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 rounded-2xl transition-all"
                >
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Scissors className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-foreground">Rapikan Foto Produk</h3>
                        <p className="text-muted-foreground leading-relaxed text-xs mt-1">
                            Bersihkan background dan kualitas foto dalam satu alur.
                        </p>
                    </div>
                </button>

                <button
                    onClick={() => {
                        setUserIntent("content_from_text");
                        setCreateMode("generate");
                        setSidebarOpen(true);
                        posthog?.capture("intent_selected", { intent: "content_from_text" });
                    }}
                    className="group flex items-start gap-3 text-left p-4 bg-card border shadow-sm hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 rounded-2xl transition-all"
                >
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Wand2 className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-foreground">Buat Konten dari Teks</h3>
                        <p className="text-muted-foreground leading-relaxed text-xs mt-1">
                            Tulis brief singkat, AI bantu susun draft visual.
                        </p>
                    </div>
                </button>
            </div>

            <div className="rounded-2xl border bg-card/50 p-4">
                <button
                    type="button"
                    onClick={() => setShowExtendedCreateOptions((prev) => !prev)}
                    className="w-full flex items-center justify-between text-left"
                >
                    <div>
                        <p className="text-sm font-semibold text-foreground">Opsi Lanjutan</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Fitur khusus untuk kebutuhan konten yang lebih kompleks.
                        </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showExtendedCreateOptions ? "rotate-180" : ""}`} />
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-out ${showExtendedCreateOptions ? "max-h-40 opacity-100 mt-3 pt-3 border-t" : "max-h-0 opacity-0"}`}>
                    <div>
                        <button
                            onClick={() => {
                                posthog?.capture("intent_selected", { intent: "carousel_instagram" });
                                router.push("/create/carousel");
                            }}
                            className="group w-full flex items-start gap-3 text-left p-3 bg-background border hover:border-emerald-500/50 rounded-xl transition-all"
                        >
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <PanelsTopLeft className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Carousel Instagram</h3>
                                <p className="text-muted-foreground leading-relaxed text-xs mt-1">
                                    Susun 5-10 slide dan export ZIP PNG langsung.
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
