"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate, Loader2, ImagePlus, X, PanelLeftOpen, PanelLeftClose, Sparkles } from "lucide-react";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { AppHeader } from "@/components/layout/AppHeader";
import { useProjectApi } from "@/lib/api";
import { generateCanvasElementsFromTemplate } from "@/lib/templateEngine";
import { TemplateBrowser } from "@/components/templates/TemplateBrowser";
import { useRouter } from "next/navigation";

interface ParsedDesignData {
    headline?: string;
    sub_headline?: string;
    cta?: string;
    visual_prompt?: string;
    suggested_colors?: string[];
    generated_image_url?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function CreatePage() {
    const { status } = useSession();
    const router = useRouter();
    const { generateDesign, getJobStatus, saveProject, uploadImage } = useProjectApi();

    const [rawText, setRawText] = useState("");
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [stylePreference, setStylePreference] = useState("bold");
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedDesignData | null>(null);
    const [referenceFile, setReferenceFile] = useState<File | null>(null);
    const [referencePreview, setReferencePreview] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (status === "loading") {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith("image/")) {
            alert("Hanya file gambar (PNG, JPG) yang diperbolehkan.");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            alert("Ukuran file maksimal 5MB.");
            return;
        }
        setReferenceFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setReferencePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        // Reset input so re-selecting the same file works
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveFile = () => {
        setReferenceFile(null);
        setReferencePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleGenerate = async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        setParsedData(null);

        try {
            // STEP 1: Parse Text
            const parseRes = await fetch("http://localhost:8000/api/designs/parse", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    raw_text: rawText,
                    aspect_ratio: aspectRatio,
                    style_preference: stylePreference,
                    num_variations: 2
                }),
            });

            if (!parseRes.ok) throw new Error("Failed to parse text");
            const parsed = await parseRes.json();
            setParsedData(parsed);

            // STEP 0: Upload Reference Image
            let uploadedReferenceUrl = undefined;
            if (referenceFile) {
                try {
                    const uploadRes = await uploadImage(referenceFile);
                    uploadedReferenceUrl = uploadRes.url;
                } catch (e) {
                    console.error("Failed to upload reference image", e);
                    throw new Error("Failed to upload reference image");
                }
            }

            // Add template-specific prompt suffix to rawText if available
            const finalPrompt = selectedTemplate?.prompt_suffix
                ? `${rawText.trim()}. ${selectedTemplate.prompt_suffix}`
                : rawText;

            // STEP 2: Generate Design (Background Image)
            const jobData = await generateDesign({
                raw_text: finalPrompt,
                aspect_ratio: aspectRatio,
                style_preference: stylePreference,
                reference_image_url: uploadedReferenceUrl,
                template_id: selectedTemplate?.id,
            });
            const jobId = jobData.job_id;

            // STEP 3: Poll for Job Status
            let isComplete = false;
            let pollingAttempts = 0;
            const maxAttempts = 60; // 2 minutes with 2s intervals

            while (!isComplete && pollingAttempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay

                const statusData = await getJobStatus(jobId);

                if (statusData.status === "completed") {
                    isComplete = true;
                    setParsedData(prev => prev ? {
                        ...prev,
                        generated_image_url: statusData.result_url
                    } : null);
                } else if (statusData.status === "failed") {
                    throw new Error(statusData.error_message || "Design generation failed");
                }

                pollingAttempts++;
            }

            if (!isComplete) throw new Error("Generation timed out");

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Gagal memproses desain.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleProceedToEditor = async () => {
        if (!parsedData) return;
        setIsSaving(true);
        try {
            const elements = generateCanvasElementsFromTemplate(
                parsedData,
                selectedTemplate?.default_text_layers || []
            );
            const newProject = await saveProject({
                title: selectedTemplate ? `AI + ${selectedTemplate.name}` : "AI Generated Design",
                status: "draft",
                canvas_state: {
                    backgroundUrl: parsedData.generated_image_url || selectedTemplate?.thumbnail_url || null,
                    elements: elements
                }
            });
            router.push(`/edit/${newProject.id}`);
        } catch (error) {
            console.error('Failed to create project', error);
            alert('Gagal melanjutkan ke editor. Silakan coba lagi.');
            setIsSaving(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectTemplate = (template: any) => {
        // Toggle selection
        if (selectedTemplate?.id === template.id) {
            setSelectedTemplate(null);
        } else {
            setSelectedTemplate(template);
            // Optionally auto-scroll to input text to guide user
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Auto-fill format and style from template
            if (template.aspect_ratio) setAspectRatio(template.aspect_ratio);
            if (template.style) setStylePreference(template.style);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <OnboardingTour />
            <AppHeader />

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile sidebar toggle */}
                <button
                    className="md:hidden absolute top-3 left-3 z-30 bg-card border rounded-lg p-2 shadow-md hover:bg-muted transition-colors"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                </button>

                {/* Sidebar Inputs */}
                <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 absolute md:relative w-80 border-r flex flex-col bg-card overflow-y-auto shrink-0 z-20 shadow-xl h-full transition-transform duration-200`}>
                    <div className="p-4 space-y-6 flex-1">
                        <div className="space-y-2 tour-step-1">
                            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                                Teks Promosi
                            </label>
                            <Textarea
                                placeholder="Contoh: Promo Seblak Pedas, Diskon 50% khusus Jumat"
                                className="resize-none h-32 focus-visible:ring-primary"
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500 text-white text-xs font-bold">2</span>
                                Gambar Referensi
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                                onChange={handleFileInputChange}
                            />
                            {referencePreview ? (
                                <div className="relative group rounded-xl overflow-hidden border border-border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={referencePreview}
                                        alt="Gambar referensi"
                                        className="w-full h-40 object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                        title="Hapus gambar"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="p-2 bg-muted/80 text-xs text-muted-foreground truncate">
                                        {referenceFile?.name}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${isDragOver
                                        ? "border-primary bg-primary/10"
                                        : "border-muted-foreground/25 hover:bg-muted/50"
                                        }`}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
                                    <p className="text-sm font-medium">
                                        {isDragOver ? "Lepaskan gambar di sini" : "Unggah Gambar"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 tour-step-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">3</span>
                                Format & Gaya
                            </label>
                            <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Format" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1:1">Postingan Square (1:1)</SelectItem>
                                    <SelectItem value="9:16">Story / Reels (9:16)</SelectItem>
                                    <SelectItem value="16:9">Lanskap (16:9)</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={stylePreference} onValueChange={setStylePreference}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Gaya Desain" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bold">Bold & Vibrant</SelectItem>
                                    <SelectItem value="minimalist">Minimalist / Clean</SelectItem>
                                    <SelectItem value="elegant">Elegant / Premium</SelectItem>
                                    <SelectItem value="playful">Playful / Fun</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="p-4 border-t bg-card sticky bottom-0 tour-step-3">
                        {selectedTemplate && (
                            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                                        {selectedTemplate.thumbnail_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={selectedTemplate.thumbnail_url} alt={selectedTemplate.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <LayoutTemplate className="w-5 h-5 text-muted-foreground opacity-50" />
                                        )}
                                    </div>
                                    <div className="flex flex-col truncate">
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Preset Aktif</span>
                                        <span className="text-sm font-medium truncate">{selectedTemplate.name}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTemplate(null)}
                                    className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors shrink-0"
                                    title="Hapus preset"
                                >
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>
                        )}
                        <Button
                            className="w-full font-bold shadow-lg gap-2"
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isParsing || !rawText.trim()}
                        >
                            {isParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...</> : <><Sparkles className="w-4 h-4" /> Buat Desain AI</>}
                        </Button>
                    </div>
                </aside>

                {/* Main Workspace Preview (Week 1 Scope) */}
                <main className="flex-1 bg-muted/20 relative overflow-y-auto p-8 flex justify-center items-start">
                    {parsedData ? (
                        <Card className="max-w-xl w-full mx-auto mt-10 shadow-xl border-primary/20 bg-card/95 backdrop-blur">
                            <CardHeader className="bg-primary/5 border-b pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <LayoutTemplate className="w-5 h-5 text-primary" />
                                    Struktur Desain AI
                                </CardTitle>
                                <CardDescription>
                                    AI telah membedah teks promo Anda menjadi elemen-elemen grafis yang siap diposisikan di atas template.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Headline</h4>
                                    <p className="text-3xl font-jakarta font-black leading-tight text-foreground">{parsedData.headline}</p>
                                </div>

                                {parsedData.sub_headline && (
                                    <div>
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sub-Headline</h4>
                                        <p className="text-lg text-muted-foreground font-medium">{parsedData.sub_headline}</p>
                                    </div>
                                )}

                                {parsedData.cta && (
                                    <div>
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Call To Action</h4>
                                        <Badge variant="default" className="text-md px-4 py-1.5">{parsedData.cta}</Badge>
                                    </div>
                                )}

                                <div className="pt-4 border-t">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Prompt Gambar (Background)</h4>
                                    {parsedData.generated_image_url ? (
                                        <div className="rounded-md overflow-hidden border">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={parsedData.generated_image_url} alt="Generated Background" className="w-full h-auto" />
                                        </div>
                                    ) : (
                                        <p className="text-sm font-mono bg-muted p-3 rounded-md text-muted-foreground leading-relaxed">
                                            {parsedData.visual_prompt}
                                        </p>
                                    )}
                                </div>

                                {(parsedData.suggested_colors?.length ?? 0) > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Rekomendasi Warna</h4>
                                        <div className="flex gap-3">
                                            {parsedData.suggested_colors?.map((color: string, i: number) => (
                                                <div key={i} className="flex flex-col items-center gap-1">
                                                    <div className="w-10 h-10 rounded-full shadow-inner border border-border" style={{ backgroundColor: color }} />
                                                    <span className="text-[10px] text-muted-foreground font-mono uppercase">{color}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <div className="p-6 border-t bg-muted/5 flex justify-end">
                                <Button
                                    size="lg"
                                    onClick={handleProceedToEditor}
                                    disabled={isSaving}
                                    className="gap-2 shadow-md hover:shadow-lg transition-shadow"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                    Lanjut ke Editor
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        <div className="max-w-3xl w-full mx-auto">
                            <div className="text-center mb-8 opacity-60">
                                <LayoutTemplate className="w-12 h-12 mx-auto mb-3" />
                                <p className="text-lg font-medium">Area Kerja</p>
                                <p className="text-sm">Masukkan teks promosional di sidebar, atau pilih template di bawah</p>
                            </div>
                            <TemplateBrowser
                                onSelectTemplate={handleSelectTemplate}
                                aspectRatio={aspectRatio}
                                selectedTemplateId={selectedTemplate?.id}
                            />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
