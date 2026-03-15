"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, PanelLeftOpen, PanelLeftClose, X, ImagePlus } from "lucide-react";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { AppHeader } from "@/components/layout/AppHeader";
import { useProjectApi, BrandKit } from "@/lib/api";
import { generateCanvasElementsFromTemplate } from "@/lib/templateEngine";
import { useRouter } from "next/navigation";
import { ParsedDesignData, VisualPromptPart, BriefQuestion, MAX_FILE_SIZE } from "@/app/create/types";

import { GenerationProgress } from "@/components/create/GenerationProgress";
import { SidebarInputForm } from "@/components/create/SidebarInputForm";
import { DesignBriefInterview } from "@/components/create/DesignBriefInterview";
import { SidebarActionBar } from "@/components/create/SidebarActionBar";
import { UnifiedPreviewEditor } from "@/components/create/UnifiedPreviewEditor";
import { UnifiedResultsView } from "@/components/create/UnifiedResultsView";
import { CopywritingVariation } from "@/lib/api";
import { ErrorModal } from "@/components/feedback/ErrorModal";
import { InlineErrorBanner } from "@/components/feedback/InlineErrorBanner";
import { toast } from "sonner";
import { BrandSwitcher } from '@/components/editor/BrandSwitcher'; // Added BrandSwitcher import


type CreateStep = 'input' | 'brief' | 'results' | 'generating' | 'preview';

interface SavedCreateState {
    rawText: string;
    aspectRatio: string;
    stylePreference: string;
    currentStep: CreateStep;
    parsedData: ParsedDesignData | null;
    imageHistory: { url: string; prompt: string }[];
    activeImageIndex: number;
    integratedText: boolean;
    briefQuestions: BriefQuestion[];
    briefAnswers: Record<string, string>;
    removeProductBg: boolean;
    copyVariations: CopywritingVariation[];
}

export default function CreatePage() {
    const { status } = useSession();
    const router = useRouter();
    const { generateDesign, getJobStatus, saveProject, uploadImage, getActiveBrandKit, clarifyUnified, generateCopywriting, parseDesignText, generateProjectTitle, getStorageUsage } = useProjectApi();

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
    const [briefQuestions, setBriefQuestions] = useState<BriefQuestion[]>([]);
    const [briefAnswers, setBriefAnswers] = useState<Record<string, string>>({});
    const [removeProductBg, setRemoveProductBg] = useState(false);
    const [copyVariations, setCopyVariations] = useState<CopywritingVariation[]>([]);
    
    // Error Handling State
    const [errorModalState, setErrorModalState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        type: 'safety' | 'credits' | 'system' | 'storage';
        actionLabel?: string;
        onAction?: () => void;
    }>({
        isOpen: false,
        title: "",
        description: "",
        type: "system"
    });
    const [inlineError, setInlineError] = useState<{
        message: string;
        type: 'error' | 'warning';
        onRetry?: () => void;
    } | null>(null);
    
    // Brand Kit State
    const [activeBrandKit, setActiveBrandKit] = useState<BrandKit | null>(null);

    useEffect(() => {
        // Fetch active brand kit on mount
        const fetchBrandKit = async () => {
            try {
                const kit = await getActiveBrandKit();
                setActiveBrandKit(kit);
            } catch (err) {
                console.error("Failed to fetch active brand kit:", err);
            }
        };
        fetchBrandKit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Image History State
    const [imageHistory, setImageHistory] = useState<{ url: string; prompt: string }[]>([]);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showManualRef, setShowManualRef] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load state from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('smartdesign_create_state');
        const urlParams = window.location.search ? new URLSearchParams(window.location.search) : null;
        const queryImageUrl = urlParams ? urlParams.get('imageUrl') : null;

        if (queryImageUrl) {
            setImageHistory([{ url: queryImageUrl, prompt: "Imported from AI Tools" }]);
            setActiveImageIndex(0);
            setCurrentStep('preview');
            setParsedData(null);
            setRawText("Imported from AI Tools");
        } else if (saved) {
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
                setBriefQuestions(parsed.briefQuestions || []);
                setBriefAnswers(parsed.briefAnswers || {});
                setRemoveProductBg(parsed.removeProductBg || false);
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
            removeProductBg,
            briefQuestions,
            briefAnswers,
            copyVariations
        };
        localStorage.setItem('smartdesign_create_state', JSON.stringify(stateToSave));
    }, [
        isInitialized, rawText, aspectRatio, stylePreference, currentStep,
        parsedData, imageHistory, activeImageIndex, integratedText, removeProductBg,
        briefQuestions, briefAnswers, copyVariations
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
            setBriefQuestions([]);
            setBriefAnswers({});
            setCopyVariations([]);
            setReferenceFile(null);
            setReferencePreview(null);
            setRemoveProductBg(false);
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
            toast.error("Hanya file gambar (PNG, JPG) yang diperbolehkan.");
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error("Ukuran file maksimal 5MB.");
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
        setBriefQuestions([]);
        setBriefAnswers({});

        try {
            // STEP 1a: Get Unified Clarification Questions
            const clarifyData = await clarifyUnified({ raw_text: rawText });
            
            if (clarifyData.questions && clarifyData.questions.length > 0) {
                setBriefQuestions(clarifyData.questions);
                setCurrentStep('brief');
                if (window.innerWidth < 768) setSidebarOpen(false); // Close sidebar on mobile
            } else {
                // Fallback to direct parse if no questions generated
                await handleGeneratePrompt({});
            }

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Gagal menganalisis teks.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleGeneratePrompt = async (answers: Record<string, string>) => {
        setIsParsing(true);
        setBriefAnswers(answers);
        try {
            // STEP 1b: Parallel Parse Text and Generate Copywriting using proper API hooks
            const [parsed, copywritingData] = await Promise.allSettled([
                parseDesignText({
                    raw_text: rawText,
                    aspect_ratio: aspectRatio,
                    style_preference: stylePreference,
                    num_variations: 2,
                    integrated_text: integratedText,
                    clarification_answers: answers
                }),
                generateCopywriting({
                    product_description: rawText,
                    tone: "persuasive",
                    brand_name: activeBrandKit?.name,
                    clarification_answers: answers
                })
            ]);

            if (parsed.status === 'rejected') {
                throw new Error("Failed to parse visual design text");
            }
            setParsedData(parsed.value);

            if (copywritingData.status === 'fulfilled') {
                setCopyVariations(copywritingData.value.variations || []);
            } else {
                console.warn("Failed to generate copywriting, continuing with visual prompt...");
                setCopyVariations([]);
            }

            setCurrentStep('results');
            if (window.innerWidth < 768) setSidebarOpen(false);

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Gagal menghasilkan prompt.");
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

            // Check storage quota before proceeding with uploads and generation
            try {
                const storageInfo = await getStorageUsage();
                if (storageInfo.percentage >= 80 && storageInfo.percentage < 100) {
                    toast.warning(
                        `Penyimpanan hampir penuh (${storageInfo.percentage}%). Pertimbangkan menghapus file lama agar tidak gagal.`,
                        { duration: 5000 }
                    );
                }
            } catch (e) {
                console.warn("Could not fetch storage usage before generation", e);
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

            const finalPrompt = assembledPrompt;

            // STEP 2: Generate Design (Background Image)
            const jobData = await generateDesign({
                raw_text: finalPrompt,
                aspect_ratio: aspectRatio,
                style_preference: stylePreference,
                reference_image_url: uploadedReferenceUrl,
                integrated_text: integratedText,
                remove_product_bg: removeProductBg && !!uploadedReferenceUrl,
                product_image_url: removeProductBg ? uploadedReferenceUrl : undefined,
                brand_kit_id: activeBrandKit?.id,
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
                const maxAttempts = 90; // 90 × 2s = 3 min, to accommodate Fal.ai delays

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
            const errorMessage = error instanceof Error ? error.message : "Gagal memproses desain.";
            
            // Revert back to review on failure so they can try again
            setCurrentStep('results');
            
            if (errorMessage.toLowerCase().includes("pelanggaran") || errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("nsfw")) {
                setErrorModalState({
                    isOpen: true,
                    title: "Deskripsi Tidak Diizinkan",
                    description: errorMessage,
                    type: "safety",
                    actionLabel: "Ubah Deskripsi",
                    onAction: () => {
                        setErrorModalState(prev => ({ ...prev, isOpen: false }));
                        setCurrentStep('input');
                    }
                });
            } else if (errorMessage.toLowerCase().includes("storage quota") || errorMessage.includes("413") || errorMessage.toLowerCase().includes("penyimpanan penuh")) {
                 setErrorModalState({
                    isOpen: true,
                    title: "Penyimpanan Penuh",
                    description: "Kuota penyimpanan Anda sudah penuh. Hapus file lama di pengaturan untuk menambah ruang.",
                    type: "storage",
                    actionLabel: "Kelola Penyimpanan",
                    onAction: () => {
                        setErrorModalState(prev => ({ ...prev, isOpen: false }));
                        router.push('/settings');
                    }
                });
            } else if (errorMessage.toLowerCase().includes("kredit") || errorMessage.toLowerCase().includes("credit")) {
                setErrorModalState({
                    isOpen: true,
                    title: "Kredit Habis",
                    description: errorMessage.includes("kredit") ? errorMessage : "Kredit Anda tidak mencukupi untuk melakukan generasi AI ini. Silakan top up kredit Anda.",
                    type: "credits",
                    actionLabel: "Beli Kredit",
                    onAction: () => {
                        setErrorModalState(prev => ({ ...prev, isOpen: false }));
                        router.push('/settings');
                    }
                });
            } else if (errorMessage.toLowerCase().includes("timed out") || errorMessage.toLowerCase().includes("timeout")) {
                setInlineError({
                    message: "Generasi gambar memakan waktu terlalu lama (timeout). Jangan khawatir, kredit Anda tidak terpotong.",
                    type: "warning",
                    onRetry: () => {
                        setInlineError(null);
                        handleGenerateImage();
                    }
                });
            } else {
                setInlineError({
                    message: `Terjadi kesalahan saat memproses gambar: ${errorMessage}`,
                    type: "error",
                    onRetry: () => {
                        setInlineError(null);
                        handleGenerateImage();
                    }
                });
            }
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleProceedToEditor = async () => {
        if (!parsedData) return;
        
        // Use active image from history if available
        const activeImageUrl = imageHistory[activeImageIndex]?.url || parsedData.generated_image_url;
        
        setIsSaving(true);
        try {
            // Dynamically detect aspect ratio from the generated image
            let finalAspectRatio = aspectRatio; // Fallback to user selection
            if (activeImageUrl) {
                const proxyUrl = activeImageUrl.startsWith('http')
                    ? `/api/proxy-image?url=${encodeURIComponent(activeImageUrl)}`
                    : activeImageUrl;
                
                finalAspectRatio = await new Promise<string>((resolve) => {
                    const img = new window.Image();
                    img.crossOrigin = 'anonymous';
                    let resolved = false;

                    img.onload = () => {
                        if (resolved) return;
                        resolved = true;
                        const ratio = img.width / img.height;
                        if (ratio > 1.2) resolve("16:9");
                        else if (ratio < 0.8) resolve("9:16");
                        else resolve("1:1");
                    };

                    img.onerror = () => {
                        if (resolved) return;
                        resolved = true;
                        resolve(aspectRatio); // Fallback on error
                    };

                    setTimeout(() => {
                        if (resolved) return;
                        resolved = true;
                        resolve(aspectRatio); // Fallback on timeout
                    }, 3000);

                    img.src = proxyUrl;
                });
            }

            const elements = integratedText
                ? []
                : generateCanvasElementsFromTemplate(
                    parsedData,
                    []
                );

            const getDynamicTitleFallback = (prompt: string) => {
                if (!prompt) return "Desain AI Baru";
                const words = prompt.trim().split(/\s+/).slice(0, 5).join(' ');
                const titleCase = words.replace(/\b\w/g, c => c.toUpperCase());
                return prompt.trim().split(/\s+/).length > 5 ? `${titleCase}...` : titleCase;
            };

            let projectTitle = getDynamicTitleFallback(parsedData.indonesian_translation || rawText);
            try {
                const titleRes = await generateProjectTitle(rawText || parsedData.indonesian_translation || "");
                if (titleRes && titleRes.title) {
                    projectTitle = titleRes.title;
                }
            } catch (titleError) {
                console.warn("Failed to generate AI title, using fallback", titleError);
            }

            const newProject = await saveProject({
                title: projectTitle,
                status: "draft",
                aspect_ratio: finalAspectRatio, // Use the dynamically detected aspect ratio
                canvas_state: {
                    backgroundUrl: activeImageUrl || null,
                    elements: elements,
                    originalPrompt: parsedData.visual_prompt || rawText
                }
            });

            router.push(`/edit/${newProject.id}`);
        } catch (error) {
            console.error('Failed to create project', error);
            toast.error('Gagal melanjutkan ke editor. Silakan coba lagi.');
            setIsSaving(false);
        }
    };


    // Dynamic step numbering for Format & Gaya (Removed, handled in SidebarInputForm now)

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <OnboardingTour />
            <AppHeader
                renderActions={() => (
                    <div className="flex items-center gap-3">
                        {/* Brand Kit Switcher Area */}
                        <div className="flex items-center gap-2">
                            <BrandSwitcher />
                        </div>
                    </div>
                )}
            />

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
                            removeProductBg={removeProductBg}
                            setRemoveProductBg={setRemoveProductBg}
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
                            activeBrandKit={activeBrandKit}
                        />
                    </div>

                    <SidebarActionBar
                        currentStep={currentStep}
                        isParsing={isParsing}
                        rawText={rawText}
                        isInputLocked={isInputLocked}
                        onAnalyze={handleAnalyze}
                        onBackToInput={() => setCurrentStep('input')}
                    />
                </aside>

                {/* Main Workspace Preview (Week 1 Scope) */}
                <main className={`flex-1 bg-muted/20 relative flex flex-col items-center justify-start ${currentStep === 'preview' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-8'}`}>
                    {/* Reset Button - Top right of main content */}
                    {(rawText || currentStep !== 'input') && currentStep !== 'preview' && (
                        <div className="w-full max-w-3xl mx-auto flex justify-end mb-1 shrink-0 animation-fade-in">
                            <button 
                                type="button"
                                onClick={handleResetState} 
                                className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors flex items-center gap-1"
                            >
                                <X className="w-3 h-3" /> Mulai Baru
                            </button>
                        </div>
                    )}
                    {inlineError && (
                        <div className="w-full max-w-4xl mx-auto mb-4 z-10 shrink-0">
                            <InlineErrorBanner 
                                message={inlineError.message} 
                                type={inlineError.type} 
                                onRetry={inlineError.onRetry} 
                                onDismiss={() => setInlineError(null)} 
                            />
                        </div>
                    )}
                    
                    <div className={`flex-1 w-full flex justify-center ${currentStep === 'preview' ? 'items-stretch overflow-hidden min-h-0' : 'items-start'}`}>
                        {currentStep === 'brief' && briefQuestions.length > 0 ? (
                        <DesignBriefInterview 
                            questions={briefQuestions}
                            onComplete={(answers) => handleGeneratePrompt(answers)}
                            onSkip={() => handleGeneratePrompt({})}
                            isGeneratingPrompt={isParsing}
                        />
                    ) : currentStep === 'results' && parsedData ? (
                        <UnifiedResultsView
                            copyVariations={copyVariations}
                            parsedData={parsedData}
                            onSelectCopy={(fullText) => setRawText(fullText)}
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
                            onGenerate={handleGenerateImage}
                            isGeneratingImage={isGeneratingImage}
                        />
                    ) : currentStep === 'preview' && parsedData ? (
                        <UnifiedPreviewEditor
                            parsedData={parsedData}
                            imageHistory={imageHistory}
                            activeImageIndex={activeImageIndex}
                            setActiveImageIndex={setActiveImageIndex}
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
                            onGenerate={handleGenerateImage}
                            isGeneratingImage={isGeneratingImage}
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
                                Hasil keajaiban AI akan muncul di sini. Silakan jelaskan desain yang Anda inginkan di samping kiri untuk memulai.
                            </p>
                        </div>
                    )}
                    </div>
                </main>
            </div>
            
            <ErrorModal
                open={errorModalState.isOpen}
                onClose={() => setErrorModalState(prev => ({ ...prev, isOpen: false }))}
                title={errorModalState.title}
                description={errorModalState.description}
                type={errorModalState.type}
                actionLabel={errorModalState.actionLabel}
                onAction={errorModalState.onAction}
            />
        </div>
    );
}
