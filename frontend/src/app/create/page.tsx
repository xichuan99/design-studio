"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, PanelLeftOpen, PanelLeftClose, X, ImagePlus } from "lucide-react";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { AppHeader } from "@/components/layout/AppHeader";
import { useProjectApi, API_BASE_URL } from "@/lib/api";
import { generateCanvasElementsFromTemplate } from "@/lib/templateEngine";
import { useRouter } from "next/navigation";
import { ParsedDesignData, VisualPromptPart, MAX_FILE_SIZE } from "@/app/create/types";

import { GenerationProgress } from "@/components/create/GenerationProgress";
import { SidebarInputForm } from "@/components/create/SidebarInputForm";
import { SidebarActionBar } from "@/components/create/SidebarActionBar";
import { UnifiedPreviewEditor } from "@/components/create/UnifiedPreviewEditor";
import { VisualPromptEditor } from "@/components/create/VisualPromptEditor";

type CreateStep = 'input' | 'prompt-review' | 'generating' | 'preview';

interface SavedCreateState {
    rawText: string;
    aspectRatio: string;
    stylePreference: string;
    currentStep: CreateStep;
    parsedData: ParsedDesignData | null;
    imageHistory: { url: string; prompt: string }[];
    activeImageIndex: number;
    integratedText: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selectedTemplate: any;
}

export default function CreatePage() {
    const { status } = useSession();
    const router = useRouter();
    const { generateDesign, getJobStatus, saveProject, uploadImage } = useProjectApi();

    const [rawText, setRawText] = useState("");
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [stylePreference, setStylePreference] = useState("bold");
    const [currentStep, setCurrentStep] = useState<CreateStep>('input');
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

    // Image History State
    const [imageHistory, setImageHistory] = useState<{ url: string; prompt: string }[]>([]);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showManualRef, setShowManualRef] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('smartdesign_create_state');
        if (saved) {
            try {
                const parsed: SavedCreateState = JSON.parse(saved);
                setRawText(parsed.rawText || "");
                setAspectRatio(parsed.aspectRatio || "1:1");
                setStylePreference(parsed.stylePreference || "bold");
                // Don't restore 'generating' step — it would show a stuck spinner
                const restoredStep = parsed.currentStep === 'generating' 
                    ? (parsed.imageHistory?.length ? 'preview' : 'input') 
                    : (parsed.currentStep || 'input');
                setCurrentStep(restoredStep);
                setParsedData(parsed.parsedData || null);
                setImageHistory(parsed.imageHistory || []);
                setActiveImageIndex(parsed.activeImageIndex || 0);
                setIntegratedText(parsed.integratedText || false);
                setSelectedTemplate(parsed.selectedTemplate || null);
            } catch (e) {
                console.error("Failed to parse saved state", e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (!isInitialized) return;

        const stateToSave: SavedCreateState = {
            rawText,
            aspectRatio,
            stylePreference,
            currentStep,
            parsedData,
            imageHistory,
            activeImageIndex,
            integratedText,
            selectedTemplate
        };
        localStorage.setItem('smartdesign_create_state', JSON.stringify(stateToSave));
    }, [
        isInitialized, rawText, aspectRatio, stylePreference, currentStep, 
        parsedData, imageHistory, activeImageIndex, integratedText, selectedTemplate
    ]);

    const handleTogglePromptPart = (index: number) => {
        if (!parsedData || !parsedData.visual_prompt_parts) return;
        const newParts = [...parsedData.visual_prompt_parts];
        newParts[index].enabled = !newParts[index].enabled;
        setParsedData({ ...parsedData, visual_prompt_parts: newParts });
    };

    const isInputLocked = currentStep !== 'input';

    const handleResetState = () => {
        if (confirm("Apakah Anda yakin ingin memulai desain baru? Semua progress generasi di layar ini akan hilang.")) {
            localStorage.removeItem('smartdesign_create_state');
            setRawText("");
            setAspectRatio("1:1");
            setStylePreference("bold");
            setCurrentStep('input');
            setParsedData(null);
            setImageHistory([]);
            setActiveImageIndex(0);
            setIntegratedText(false);
            setSelectedTemplate(null);
            setReferenceFile(null);
            setReferencePreview(null);
        }
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

    const handleAnalyze = async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        setParsedData(null);

        try {
            // STEP 1: Parse Text ONLY
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
            setCurrentStep('prompt-review');

        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "Gagal menganalisis teks.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!parsedData) return;
        
        setIsGeneratingImage(true);
        setCurrentStep('generating');

        try {
            // Assemble prompt from parts
            let assembledPrompt = rawText; // Fallback
            if (parsedData.visual_prompt_parts && parsedData.visual_prompt_parts.length > 0) {
                const activeParts = parsedData.visual_prompt_parts
                    .filter((p: VisualPromptPart) => p.enabled)
                    .map((p: VisualPromptPart) => p.value);

                if (activeParts.length > 0) {
                    assembledPrompt = activeParts.join(", ");
                } else {
                    assembledPrompt = parsedData.visual_prompt || rawText;
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
            const jobData = await generateDesign({
                raw_text: finalPrompt,
                aspect_ratio: aspectRatio,
                style_preference: stylePreference,
                reference_image_url: uploadedReferenceUrl,
                template_id: selectedTemplate?.id,
                integrated_text: integratedText,
            });
            const jobId = jobData.job_id;

            if (jobData.status === "completed") {
                const statusData = await getJobStatus(jobId);
                if (statusData.status === "completed" && statusData.result_url) {
                    const newUrl = statusData.result_url;
                    setImageHistory(prev => [...prev, { url: newUrl, prompt: finalPrompt }]);
                    setActiveImageIndex(imageHistory.length);

                    setParsedData(prev => prev ? {
                        ...prev,
                        generated_image_url: newUrl
                    } : null);
                    setCurrentStep('preview');
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
                        const newUrl = statusData.result_url;
                        setImageHistory(prev => [...prev, { url: newUrl, prompt: finalPrompt }]);
                        setActiveImageIndex(imageHistory.length);

                        setParsedData(prev => prev ? {
                            ...prev,
                            generated_image_url: newUrl
                        } : null);
                        setCurrentStep('preview');
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
            // Revert back to review on failure so they can try again
            setCurrentStep('prompt-review');
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleProceedToEditor = async () => {
        if (!parsedData) return;
        
        // Use active image from history if available
        const activeImageUrl = imageHistory[activeImageIndex]?.url || parsedData.generated_image_url || selectedTemplate?.thumbnail_url;
        
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
                    backgroundUrl: activeImageUrl || null,
                    elements: elements
                }
            });

            // Prefetch background image through proxy so it's in browser cache
            const bgUrl = activeImageUrl;
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

    // Dynamic step numbering for Format & Gaya (Removed, handled in SidebarInputForm now)

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

                {/* Mobile Backdrop Overlay */}
                {sidebarOpen && (
                    <div 
                        className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-10"
                        onClick={() => setSidebarOpen(false)}
                        aria-hidden="true"
                    />
                )}

                {/* Sidebar Inputs */}
                <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 absolute md:relative w-full max-w-[420px] md:w-[420px] border-r flex flex-col bg-card overflow-y-auto shrink-0 z-20 shadow-xl h-full transition-transform duration-200`}>
                    <div className="p-4 space-y-6 flex-1 relative">
                        {/* Reset Button */}
                        {(rawText || currentStep !== 'input') && (
                            <div className="absolute top-2 right-4 z-10 transition-opacity animation-fade-in">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleResetState} 
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 text-xs font-medium px-2"
                                >
                                    <X className="w-3 h-3 mr-1" /> Mulai Baru
                                </Button>
                            </div>
                        )}

                        <SidebarInputForm
                            rawText={rawText}
                            setRawText={setRawText}
                            isInputLocked={isInputLocked}
                            isParsing={isParsing}
                            aspectRatio={aspectRatio}
                            setAspectRatio={setAspectRatio}
                            stylePreference={stylePreference}
                            setStylePreference={setStylePreference}
                            integratedText={integratedText}
                            setIntegratedText={setIntegratedText}
                            selectedTemplate={selectedTemplate}
                            handleSelectTemplate={handleSelectTemplate}
                            showManualRef={showManualRef}
                            setShowManualRef={setShowManualRef}
                            referenceFile={referenceFile}
                            referencePreview={referencePreview}
                            isDragOver={isDragOver}
                            fileInputRef={fileInputRef}
                            handleFileInputChange={handleFileInputChange}
                            handleRemoveFile={handleRemoveFile}
                            handleDragOver={handleDragOver}
                            handleDragLeave={handleDragLeave}
                            handleDrop={handleDrop}
                        />
                    </div>

                    <SidebarActionBar
                        selectedTemplate={selectedTemplate}
                        currentStep={currentStep}
                        isParsing={isParsing}
                        isGeneratingImage={isGeneratingImage}
                        rawText={rawText}
                        isInputLocked={isInputLocked}
                        onClearTemplate={() => { setSelectedTemplate(null); setShowManualRef(false); }}
                        onAnalyze={handleAnalyze}
                        onGenerate={handleGenerateImage}
                        onBackToInput={() => setCurrentStep('input')}
                    />
                </aside>

                {/* Main Workspace Preview (Week 1 Scope) */}
                <main className={`flex-1 bg-muted/20 relative flex justify-center items-start ${currentStep === 'preview' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-8'}`}>
                    {currentStep === 'prompt-review' && parsedData ? (
                        <div className="w-full max-w-4xl mx-auto animation-fade-in shadow-xl rounded-2xl overflow-hidden border border-border/50">
                            <VisualPromptEditor
                                parsedData={parsedData}
                                onTogglePromptPart={handleTogglePromptPart}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onModifyPromptParts={(newParts: any, newCombined: string, newTranslation?: string) => {
                                    setParsedData(prev => prev ? {
                                        ...prev,
                                        visual_prompt_parts: newParts,
                                        visual_prompt: newCombined,
                                        indonesian_translation: newTranslation || prev.indonesian_translation
                                    } : null);
                                }}
                            />
                        </div>
                    ) : currentStep === 'preview' && parsedData ? (
                        <UnifiedPreviewEditor
                            parsedData={parsedData}
                            imageHistory={imageHistory}
                            activeImageIndex={activeImageIndex}
                            setActiveImageIndex={setActiveImageIndex}
                            selectedTemplate={selectedTemplate}
                            isSaving={isSaving}
                            onProceedToEditor={handleProceedToEditor}
                            onTogglePromptPart={handleTogglePromptPart}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onModifyPromptParts={(newParts: any, newCombined: string, newTranslation?: string) => {
                                setParsedData(prev => prev ? {
                                    ...prev,
                                    visual_prompt_parts: newParts,
                                    visual_prompt: newCombined,
                                    indonesian_translation: newTranslation || prev.indonesian_translation
                                } : null);
                            }}
                        />
                    ) : currentStep === 'generating' ? (
                        <GenerationProgress />
                    ) : isParsing ? (
                        <div className="max-w-2xl w-full mx-auto h-full flex flex-col items-center justify-center animation-fade-in">
                            <div className="text-center space-y-4">
                                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto opacity-80" />
                                <h2 className="text-2xl font-bold tracking-tight">AI Sedang Fokus 👀</h2>
                                <p className="text-muted-foreground max-w-sm">
                                    Menganalisis deskripsi Anda untuk menentukan struktur desain yang paling pas secara semantik...
                                </p>
                            </div>
                        </div>
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
