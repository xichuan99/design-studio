import { useState, useRef, useEffect, useCallback } from "react";
import {
    useProjectApi,
    BrandKit,
    CopywritingVariation,
} from "@/lib/api";
import { generateCanvasElementsFromTemplate } from "@/lib/templateEngine";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ParsedDesignData, VisualPromptPart, BriefQuestion, MAX_FILE_SIZE } from "@/app/create/types";

export type CreateStep = 'input' | 'brief' | 'results' | 'generating' | 'preview';
export type CreateMode = 'generate' | 'redesign';

export interface SavedCreateState {
    rawText: string;
    aspectRatio: string;
    currentStep: CreateStep;
    createMode: CreateMode;
    redesignStrength: number;
    parsedData: ParsedDesignData | null;
    imageHistory: { url: string; prompt: string }[];
    activeImageIndex: number;
    integratedText: boolean;
    briefQuestions: BriefQuestion[];
    briefAnswers: Record<string, string>;
    removeProductBg: boolean;
    copyVariations: CopywritingVariation[];
}

export function useCreateDesign() {
    const router = useRouter();
    const { generateDesign, redesignFromReference, getJobStatus, saveProject, uploadImage, getActiveBrandKit, clarifyUnified, generateCopywriting, parseDesignText, generateProjectTitle, getStorageUsage } = useProjectApi();

    const [rawText, setRawText] = useState("");
    const [aspectRatio, setAspectRatio] = useState("1:1");
    const [createMode, setCreateMode] = useState<CreateMode>('generate');
    const [redesignStrength, setRedesignStrength] = useState<number>(0.65);
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
    
    // Brand Kit Opt-in State
    const [brandKitEnabled, setBrandKitEnabled] = useState(false);
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
                setCreateMode(parsed.createMode || 'generate');
                setRedesignStrength(parsed.redesignStrength ?? 0.65);
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
                setCopyVariations(parsed.copyVariations || []);
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
            currentStep,
            createMode,
            redesignStrength,
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
        isInitialized, rawText, aspectRatio, currentStep, createMode, redesignStrength,
        parsedData, imageHistory, activeImageIndex, integratedText, removeProductBg,
        briefQuestions, briefAnswers, copyVariations
    ]);

    const handleTogglePromptPart = useCallback((index: number) => {
        setParsedData(prev => {
            if (!prev || !prev.visual_prompt_parts) return prev;
            const newParts = [...prev.visual_prompt_parts];
            newParts[index].enabled = !newParts[index].enabled;
            return { ...prev, visual_prompt_parts: newParts };
        });
    }, []);

    const isInputLocked = currentStep !== 'input';

    const handleResetState = useCallback(() => {
        if (confirm("Apakah Anda yakin ingin memulai desain baru? Semua progress generasi di layar ini akan hilang.")) {
            localStorage.removeItem('smartdesign_create_state');
            setRawText("");
            setAspectRatio("1:1");
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
    }, []);

    const handleFileSelect = useCallback((file: File) => {
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
    }, []);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [handleFileSelect]);

    const handleRemoveFile = useCallback(() => {
        setReferenceFile(null);
        setReferencePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleGeneratePrompt = useCallback(async (answers: Record<string, string>) => {
        setIsParsing(true);
        setBriefAnswers(answers);
        try {
            const [parsed, copywritingData] = await Promise.allSettled([
                parseDesignText({
                    raw_text: rawText,
                    aspect_ratio: aspectRatio,
                    num_variations: 2,
                    integrated_text: integratedText,
                    clarification_answers: answers
                }),
                generateCopywriting({
                    product_description: rawText,
                    tone: "persuasive",
                    brand_name: (activeBrandKit && brandKitEnabled) ? activeBrandKit.name : undefined,
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
            const errorMessage = error instanceof Error ? error.message : "Gagal menghasilkan prompt.";
            // If the error message is the default one from aiToolsApi timeout, show it directly.
            // Otherwise, keep it as is.
            toast.error(errorMessage);
        } finally {
            setIsParsing(false);
        }
    }, [rawText, aspectRatio, integratedText, activeBrandKit, brandKitEnabled, parseDesignText, generateCopywriting]);

    const handleAnalyze = useCallback(async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        setParsedData(null);
        setBriefQuestions([]);
        setBriefAnswers({});

        try {
            const clarifyData = await clarifyUnified({ raw_text: rawText, mode: createMode });
            
            if (clarifyData.questions && clarifyData.questions.length > 0) {
                setBriefQuestions(clarifyData.questions);
                setCurrentStep('brief');
                if (window.innerWidth < 768) setSidebarOpen(false);
                setIsParsing(false);
            } else {
                await handleGeneratePrompt({});
            }

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Gagal menganalisis teks.";
            toast.error(errorMessage);
            setIsParsing(false); // Make sure to stop loading on error!
        }
    }, [rawText, createMode, clarifyUnified, handleGeneratePrompt]);

    const handleGenerateImage = useCallback(async () => {
        if (!parsedData) return;
        
        setIsGeneratingImage(true);
        setCurrentStep('generating');

        try {
            let assembledPrompt = rawText;
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
            let jobData;

            if (createMode === 'redesign') {
                if (!uploadedReferenceUrl) {
                    throw new Error("Gambar referensi wajib diunggah untuk fitur Redesign.");
                }
                const redesignPayload = {
                    reference_image_url: uploadedReferenceUrl,
                    raw_text: finalPrompt,
                    strength: redesignStrength,
                    aspect_ratio: aspectRatio,
                    brand_kit_id: undefined as string | undefined
                };
                if (activeBrandKit && brandKitEnabled) {
                    redesignPayload.brand_kit_id = activeBrandKit.id;
                }
                jobData = await redesignFromReference(redesignPayload);
            } else {
                const generateDesignPayload = {
                    raw_text: finalPrompt,
                    aspect_ratio: aspectRatio,
                    reference_image_url: uploadedReferenceUrl,
                    integrated_text: integratedText,
                    remove_product_bg: removeProductBg && !!uploadedReferenceUrl,
                    product_image_url: removeProductBg ? uploadedReferenceUrl : undefined,
                    brand_kit_id: undefined as string | undefined
                };
                if (activeBrandKit && brandKitEnabled) {
                    generateDesignPayload.brand_kit_id = activeBrandKit.id;
                }
                jobData = await generateDesign(generateDesignPayload);
            }
            const jobId = jobData.job_id;

            if (jobData.status === "completed") {
                const statusData = await getJobStatus(jobId);
                if (statusData.status === "completed" && statusData.result_url) {
                    const newUrl = statusData.result_url;
                    setImageHistory(prev => {
                        const newHistory = [...prev, { url: newUrl, prompt: finalPrompt }];
                        setActiveImageIndex(newHistory.length);
                        return newHistory;
                    });
                    
                    setParsedData(prev => prev ? {
                        ...prev,
                        generated_image_url: newUrl,
                        quantum_layout: statusData.quantum_layout || undefined
                    } : null);
                    setCurrentStep('preview');
                } else {
                    throw new Error(statusData.error_message || "Generation failed");
                }
            } else {
                let isComplete = false;
                let pollingAttempts = 0;
                const maxAttempts = 90;

                while (!isComplete && pollingAttempts < maxAttempts) {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    const statusData = await getJobStatus(jobId);

                    if (statusData.status === "completed") {
                        isComplete = true;
                        const newUrl = statusData.result_url;
                        setImageHistory(prev => {
                            const newHistory = [...prev, { url: newUrl, prompt: finalPrompt }];
                            setActiveImageIndex(newHistory.length);
                            return newHistory;
                        });

                        setParsedData(prev => prev ? {
                            ...prev,
                            generated_image_url: newUrl,
                            quantum_layout: statusData.quantum_layout || undefined
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
    }, [parsedData, rawText, referenceFile, aspectRatio, integratedText, removeProductBg, activeBrandKit, brandKitEnabled, createMode, redesignStrength, getStorageUsage, uploadImage, generateDesign, redesignFromReference, getJobStatus, router]);

    const handleProceedToEditor = useCallback(async () => {
        if (!parsedData) return;
        
        const activeImageUrl = imageHistory[activeImageIndex]?.url || parsedData.generated_image_url;
        
        setIsSaving(true);
        try {
            let finalAspectRatio = aspectRatio;
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
                        resolve(aspectRatio);
                    };

                    setTimeout(() => {
                        if (resolved) return;
                        resolved = true;
                        resolve(aspectRatio);
                    }, 3000);

                    img.src = proxyUrl;
                });
            }

            const elements = integratedText
                ? []
                : generateCanvasElementsFromTemplate(
                    parsedData,
                    [],
                    1024,
                    1024,
                    parsedData.quantum_layout ? JSON.parse(parsedData.quantum_layout) : undefined
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
                aspect_ratio: finalAspectRatio,
                canvas_state: {
                    backgroundUrl: activeImageUrl || null,
                    elements: elements,
                    originalPrompt: parsedData.visual_prompt || rawText
                }
            });

            // Persist copyVariations before navigating
            if (typeof window !== 'undefined') {
                localStorage.setItem('designStudio_copyVariations', JSON.stringify(copyVariations));
            }

            router.push(`/edit/${newProject.id}`);
        } catch (error) {
            console.error('Failed to create project', error);
            toast.error('Gagal melanjutkan ke editor. Silakan coba lagi.');
            setIsSaving(false);
        }
    }, [parsedData, imageHistory, activeImageIndex, aspectRatio, integratedText, rawText, generateProjectTitle, saveProject, router, copyVariations]);

    return {
        rawText, setRawText,
        aspectRatio, setAspectRatio,
        createMode, setCreateMode,
        redesignStrength, setRedesignStrength,
        currentStep, setCurrentStep,
        isParsing, setIsParsing,
        isGeneratingImage, setIsGeneratingImage,
        isSaving, setIsSaving,
        parsedData, setParsedData,
        referenceFile, setReferenceFile,
        referencePreview, setReferencePreview,
        isDragOver, setIsDragOver,
        sidebarOpen, setSidebarOpen,
        integratedText, setIntegratedText,
        briefQuestions, setBriefQuestions,
        briefAnswers, setBriefAnswers,
        removeProductBg, setRemoveProductBg,
        copyVariations, setCopyVariations,
        errorModalState, setErrorModalState,
        inlineError, setInlineError,
        activeBrandKit, setActiveBrandKit,
        imageHistory, setImageHistory,
        activeImageIndex, setActiveImageIndex,
        showManualRef, setShowManualRef,
        fileInputRef,
        isInputLocked,
        handleTogglePromptPart,
        handleResetState,
        handleFileSelect,
        handleFileInputChange,
        handleRemoveFile,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleAnalyze,
        handleGeneratePrompt,
        handleGenerateImage,
        handleProceedToEditor,
        brandKitEnabled,
        setBrandKitEnabled
    };
}
