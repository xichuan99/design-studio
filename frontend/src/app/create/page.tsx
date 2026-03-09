"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LayoutTemplate, Loader2, ImagePlus, X, PanelLeftOpen, PanelLeftClose, Sparkles } from "lucide-react";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { AppHeader } from "@/components/layout/AppHeader";
import { useProjectApi, API_BASE_URL } from "@/lib/api";
import { generateCanvasElementsFromTemplate } from "@/lib/templateEngine";
import { TemplateBrowser } from "@/components/templates/TemplateBrowser";
import { useRouter } from "next/navigation";
import { ParsedDesignData, VisualPromptPart, MAX_FILE_SIZE } from "@/app/create/types";
import { ReferenceImageUpload } from "@/components/create/ReferenceImageUpload";
import { DesignAnalysisCard } from "@/components/create/DesignAnalysisCard";
import { GenerationProgress } from "@/components/create/GenerationProgress";
import { DesignPreview } from "@/components/create/DesignPreview";


export default function CreatePage() {
    const { status } = useSession();
    const router = useRouter();
    const { generateDesign, getJobStatus, saveProject, uploadImage } = useProjectApi();

    const [rawText, setRawText] = useState("");
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [stylePreference, setStylePreference] = useState("bold");
    const [isParsing, setIsParsing] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedDesignData | null>(null);
    const [referenceFile, setReferenceFile] = useState<File | null>(null);
    const [referencePreview, setReferencePreview] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [integratedText, setIntegratedText] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [showManualRef, setShowManualRef] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleTogglePromptPart = (index: number) => {
        if (!parsedData || !parsedData.visual_prompt_parts) return;
        const newParts = [...parsedData.visual_prompt_parts];
        newParts[index].enabled = !newParts[index].enabled;
        setParsedData({ ...parsedData, visual_prompt_parts: newParts });
    };

    const handleEditPromptPart = (index: number, newValue: string) => {
        if (!parsedData || !parsedData.visual_prompt_parts) return;
        const newParts = [...parsedData.visual_prompt_parts];
        newParts[index].value = newValue;
        setParsedData({ ...parsedData, visual_prompt_parts: newParts });
    };

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
            const parseRes = await fetch(`${API_BASE_URL}/designs/parse`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    raw_text: rawText,
                    aspect_ratio: aspectRatio,
                    style_preference: stylePreference,
                    num_variations: 2,
                    integrated_text: integratedText
                }),
            });

            if (!parseRes.ok) throw new Error("Failed to parse text");
            const parsed = await parseRes.json();
            setParsedData(parsed);
            setIsParsing(false); // Stop parsing spinner early so user can read the text
            setIsGeneratingImage(true); // Start image generation spinner

            // Assemble prompt from parts if available (user might have edited/toggled them since parsing)
            let assembledPrompt = rawText; // Fallback
            if (parsed.visual_prompt_parts && parsed.visual_prompt_parts.length > 0) {
                const activeParts = parsed.visual_prompt_parts
                    .filter((p: VisualPromptPart) => p.enabled)
                    .map((p: VisualPromptPart) => p.value);

                if (activeParts.length > 0) {
                    assembledPrompt = activeParts.join(", ");
                } else {
                    assembledPrompt = parsed.visual_prompt || rawText;
                }
            }

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

            // Add template-specific prompt suffix to prompt if available
            const finalPrompt = selectedTemplate?.prompt_suffix
                ? `${assembledPrompt.trim()}. ${selectedTemplate.prompt_suffix}`
                : assembledPrompt;

            // STEP 2: Generate Design (Background Image)
            // We pass the assembled final prompt as raw_text. The backend normally parses raw_text again,
            // but since we are overriding here, Gemini will just parse our assembled English prompt 
            // and pass it mostly unchanged to Flux/Imagen.
            const jobData = await generateDesign({
                raw_text: finalPrompt,
                aspect_ratio: aspectRatio,
                style_preference: stylePreference,
                reference_image_url: uploadedReferenceUrl,
                template_id: selectedTemplate?.id,
                integrated_text: integratedText,
            });
            const jobId = jobData.job_id;

            // Check if generation already completed synchronously (Gemini Imagen path)
            if (jobData.status === "completed") {
                const statusData = await getJobStatus(jobId);
                if (statusData.status === "completed" && statusData.result_url) {
                    setParsedData(prev => prev ? {
                        ...prev,
                        generated_image_url: statusData.result_url
                    } : null);
                } else {
                    throw new Error(statusData.error_message || "Generation failed");
                }
            } else {
                // STEP 3: Poll for Job Status (Celery async path)
                let isComplete = false;
                let pollingAttempts = 0;
                const maxAttempts = 60;

                while (!isComplete && pollingAttempts < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
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
            }

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Gagal memproses desain.");
        } finally {
            setIsParsing(false);
            setIsGeneratingImage(false);
        }
    };

    const handleProceedToEditor = async () => {
        if (!parsedData) return;
        setIsSaving(true);
        try {
            const elements = integratedText
                ? []
                : generateCanvasElementsFromTemplate(
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

            // Prefetch background image through proxy so it's in browser cache
            const bgUrl = parsedData.generated_image_url || selectedTemplate?.thumbnail_url;
            if (bgUrl) {
                const proxyUrl = bgUrl.startsWith('http')
                    ? `/api/proxy-image?url=${encodeURIComponent(bgUrl)}`
                    : bgUrl;
                const prefetch = new window.Image();
                prefetch.crossOrigin = 'anonymous';
                prefetch.src = proxyUrl;
                // Wait for it to load, but don't block for more than 3 seconds
                await Promise.race([
                    new Promise(r => { prefetch.onload = r; prefetch.onerror = r; }),
                    new Promise(r => setTimeout(r, 3000))
                ]);
            }

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
            setShowManualRef(false);
        } else {
            setSelectedTemplate(template);
            setShowManualRef(false);

            // Clear reference image — template replaces it
            setReferenceFile(null);
            setReferencePreview(null);

            // Optionally auto-scroll to input text to guide user
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Auto-fill format and style from template
            if (template.aspect_ratio) setAspectRatio(template.aspect_ratio);
            if (template.style) setStylePreference(template.style);
        }
    };

    // Dynamic step numbering for Format & Gaya
    const formatStepNumber = (!selectedTemplate || showManualRef) ? 4 : 3;

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
                <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 absolute md:relative w-[420px] border-r flex flex-col bg-card overflow-y-auto shrink-0 z-20 shadow-xl h-full transition-transform duration-200`}>
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

                        <div className="space-y-2 pb-2 border-b">
                            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">2</span>
                                Template / Preset Desain
                            </label>
                            <TemplateBrowser
                                onSelectTemplate={handleSelectTemplate}
                                aspectRatio={aspectRatio}
                                selectedTemplateId={selectedTemplate?.id}
                                compact={true}
                            />
                        </div>

                        {/* Gambar Referensi - Conditional Visibility */}
                        <div className="space-y-2">
                            <ReferenceImageUpload
                                referenceFile={referenceFile}
                                referencePreview={referencePreview}
                                isDragOver={isDragOver}
                                fileInputRef={fileInputRef}
                                showManualRef={showManualRef}
                                selectedTemplate={selectedTemplate}
                                onFileInputChange={handleFileInputChange}
                                onRemoveFile={handleRemoveFile}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onShowManualRef={() => setShowManualRef(true)}
                                onHideManualRef={() => setShowManualRef(false)}
                            />
                        </div>

                        <div className="space-y-2 tour-step-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold">{formatStepNumber}</span>
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

                            <div className="mt-4 p-3 bg-muted/30 rounded-lg border">
                                <Label className="text-sm font-semibold mb-3 block">Mode Teks AI</Label>
                                <RadioGroup
                                    value={integratedText ? "integrated" : "separated"}
                                    onValueChange={(val) => setIntegratedText(val === "integrated")}
                                    className="space-y-2 mt-2"
                                >
                                    <label htmlFor="separated" className={`flex flex-col space-y-1 p-2 border rounded-md cursor-pointer transition-colors ${!integratedText ? 'bg-primary/5 border-primary/40' : 'hover:bg-muted'}`}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="separated" id="separated" />
                                            <span className="font-medium text-sm">Teks Terpisah (Canvas)</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground ml-6">Bersih & bisa diedit sesuka hati</span>
                                    </label>
                                    <label htmlFor="integrated" className={`flex flex-col space-y-1 p-2 border rounded-md cursor-pointer transition-colors ${integratedText ? 'bg-primary/5 border-primary/40' : 'hover:bg-muted'}`}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="integrated" id="integrated" />
                                            <span className="font-medium text-sm">Teks Menyatu (Gaya AI)</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground ml-6">Menyatu estetik, tapi tak bisa diedit</span>
                                    </label>
                                </RadioGroup>
                            </div>
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
                                    onClick={() => { setSelectedTemplate(null); setShowManualRef(false); }}
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
                            disabled={isParsing || isGeneratingImage || !rawText.trim()}
                        >
                            {isParsing ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...</> :
                                isGeneratingImage ? <><Loader2 className="w-4 h-4 animate-spin" /> Sedang Menggambar...</> :
                                    <><Sparkles className="w-4 h-4" /> Buat Desain AI</>}
                        </Button>
                    </div>
                </aside>

                {/* Main Workspace Preview (Week 1 Scope) */}
                <main className="flex-1 bg-muted/20 relative overflow-y-auto p-8 flex justify-center items-start">
                    {parsedData ? (
                        <div className="flex gap-4 w-full h-full justify-center">
                            <DesignPreview
                                imageUrl={parsedData.generated_image_url || selectedTemplate?.thumbnail_url || null}
                                onProceedToEditor={handleProceedToEditor}
                                isSaving={isSaving}
                            />
                            {/* Analysis Card */}
                            <DesignAnalysisCard
                                parsedData={parsedData}
                                onTogglePromptPart={handleTogglePromptPart}
                                onEditPromptPart={handleEditPromptPart}
                            />
                        </div>
                    ) : isParsing || isGeneratingImage ? (
                        <GenerationProgress isParsing={isParsing} isGeneratingImage={isGeneratingImage} />
                    ) : (
                        <div className="max-w-xl w-full mx-auto h-full flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity">
                            <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/5 flex items-center justify-center">
                                <ImagePlus className="w-10 h-10 text-primary/50" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Area Preview Desain</h2>
                            <p className="text-center text-muted-foreground max-w-md">
                                Hasil keajaiban AI akan muncul di sini. Silakan isi form di sebelah kiri dan klik <strong>Buat Desain AI</strong> untuk memulai.
                            </p>
                        </div>
                    )}
                </main>
            </div >
        </div >
    );
}
