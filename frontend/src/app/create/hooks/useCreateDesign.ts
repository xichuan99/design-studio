import { useState, useRef, useEffect, useCallback } from "react";
import {
    useProjectApi,
    BrandKit,
    CopywritingVariation,
    ModelCatalogItem,
    ModelTier,
} from "@/lib/api";
import { generateCanvasElementsFromTemplate } from "@/lib/templateEngine";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    buildHeadlineLengthWarning,
    CopyLengthWarning,
    DEFAULT_MANUAL_COPY_OVERRIDES,
    ManualCopyOverrides,
    normalizeOptionalCopyValue,
    ParsedDesignData,
    VariationResult,
    VisualPromptPart,
    BriefQuestion,
    MAX_FILE_SIZE,
    UserIntent,
} from "@/app/create/types";
import { usePostHog } from 'posthog-js/react';
import { trackEvent } from "@/lib/analytics/events";

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
    userIntent: UserIntent;
    selectedModelTier: ModelTier;
    manualCopyOverrides?: ManualCopyOverrides;
    variationResults?: VariationResult[];
    selectedVariationIndex?: number;
}

function parseBooleanString(value: string | boolean | undefined): boolean | undefined {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return undefined;
}

// Normalize frontend aspect ratio values (including marketplace/social presets) to backend-compatible values
function normalizeAspectRatio(frontendValue: string): string {
  const MAPPING: Record<string, string> = {
    "all": "1:1",
    "9:16-wa": "9:16",
    "1:1-shopee": "1:1",
    "1:1-tokped": "1:1",
  };
  return MAPPING[frontendValue] || frontendValue;
}

export function useCreateDesign() {
    const router = useRouter();
    const posthog = usePostHog();
    const { generateDesign, redesignFromReference, getJobStatus, saveProject, uploadImage, getActiveBrandKit, clarifyUnified, generateCopywriting, parseDesignText, generateProjectTitle, getStorageUsage, getModelCatalog, generateMultiFormat, submitTestimonial } = useProjectApi();

    const GENERATED_COUNT_STORAGE_KEY = "smartdesign_generated_count_v1";
    const TESTIMONIAL_SUBMITTED_STORAGE_KEY = "smartdesign_testimonial_submitted_v1";
    const FIRST_IMAGE_UPLOAD_STORAGE_KEY = "smartdesign_first_image_uploaded_v1";
    const FIRST_DESIGN_CREATED_STORAGE_KEY = "smartdesign_first_design_created_v1";

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
    const [manualCopyOverrides, setManualCopyOverrides] = useState<ManualCopyOverrides>(DEFAULT_MANUAL_COPY_OVERRIDES);
    const [removeProductBg, setRemoveProductBg] = useState(false);
    const [userIntent, setUserIntent] = useState<UserIntent>(null);
    const [selectedModelTier, setSelectedModelTier] = useState<ModelTier>("auto");
    const [modelCatalog, setModelCatalog] = useState<ModelCatalogItem[]>([]);
    const [headlineLengthWarning, setHeadlineLengthWarning] = useState<CopyLengthWarning | null>(null);
    const [generatedDesignCount, setGeneratedDesignCount] = useState(0);
    const [showTestimonialPrompt, setShowTestimonialPrompt] = useState(false);
    const [isSubmittingTestimonial, setIsSubmittingTestimonial] = useState(false);
    const [hasSubmittedTestimonial, setHasSubmittedTestimonial] = useState(false);
    const [testimonialForm, setTestimonialForm] = useState({
        name: "",
        role: "",
        quote: "",
    });
    
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

    useEffect(() => {
        const fetchModelCatalog = async () => {
            try {
                const catalog = await getModelCatalog();
                setModelCatalog(catalog.items || []);
            } catch (err) {
                console.error("Failed to fetch model catalog:", err);
            }
        };
        fetchModelCatalog();
    }, [getModelCatalog]);

    useEffect(() => {
        setHeadlineLengthWarning(
            buildHeadlineLengthWarning(
                manualCopyOverrides.headlineOverride,
                normalizeAspectRatio(aspectRatio),
                integratedText
            )
        );
    }, [aspectRatio, integratedText, manualCopyOverrides.headlineOverride]);

    const updateManualCopyOverrides = useCallback((patch: Partial<ManualCopyOverrides>) => {
        setManualCopyOverrides((prev) => ({
            ...prev,
            ...patch,
        }));
    }, []);

    // Image History State
    const [imageHistory, setImageHistory] = useState<{ url: string; prompt: string }[]>([]);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [variationResults, setVariationResults] = useState<VariationResult[]>([]);
    const [selectedVariationIndex, setSelectedVariationIndex] = useState(0);
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
                setManualCopyOverrides({
                    headlineOverride: parsed.manualCopyOverrides?.headlineOverride || parsed.briefAnswers?.headlineOverride || "",
                    subHeadlineOverride: parsed.manualCopyOverrides?.subHeadlineOverride || parsed.briefAnswers?.subHeadlineOverride || "",
                    ctaOverride: parsed.manualCopyOverrides?.ctaOverride || parsed.briefAnswers?.ctaOverride || "",
                    productName: parsed.manualCopyOverrides?.productName || parsed.briefAnswers?.productName || "",
                    offerText: parsed.manualCopyOverrides?.offerText || parsed.briefAnswers?.offerText || "",
                    useAiCopyAssist:
                        parsed.manualCopyOverrides?.useAiCopyAssist
                        ?? parseBooleanString(parsed.briefAnswers?.useAiCopyAssist)
                        ?? DEFAULT_MANUAL_COPY_OVERRIDES.useAiCopyAssist,
                });
                setRemoveProductBg(parsed.removeProductBg || false);
                setCopyVariations(parsed.copyVariations || []);
                setUserIntent(parsed.userIntent || null);
                setSelectedModelTier(parsed.selectedModelTier || "auto");
                setVariationResults(parsed.variationResults || []);
                setSelectedVariationIndex(parsed.selectedVariationIndex || 0);
            } catch (e) {
                console.error("Failed to parse saved state", e);
            }
        }

        const savedGeneratedCount = localStorage.getItem(GENERATED_COUNT_STORAGE_KEY);
        if (savedGeneratedCount) {
            const parsedCount = Number(savedGeneratedCount);
            if (!Number.isNaN(parsedCount) && parsedCount > 0) {
                setGeneratedDesignCount(parsedCount);
            }
        }

        const testimonialSubmitted = localStorage.getItem(TESTIMONIAL_SUBMITTED_STORAGE_KEY) === "1";
        setHasSubmittedTestimonial(testimonialSubmitted);

        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        if (generatedDesignCount < 5 || hasSubmittedTestimonial) return;

        setShowTestimonialPrompt(true);
    }, [generatedDesignCount, hasSubmittedTestimonial, isInitialized]);

    const recordDesignGenerated = useCallback(() => {
        setGeneratedDesignCount(prev => {
            const next = prev + 1;
            localStorage.setItem(GENERATED_COUNT_STORAGE_KEY, String(next));

            if (next >= 5 && !hasSubmittedTestimonial) {
                setShowTestimonialPrompt(true);
                posthog?.capture('testimonial_prompt_shown', {
                    generated_count: next,
                    source: 'create_generation_success',
                });
            }

            return next;
        });
    }, [hasSubmittedTestimonial, posthog]);

    const handleSubmitTestimonialPrompt = useCallback(async () => {
        const payload = {
            name: testimonialForm.name.trim(),
            role: testimonialForm.role.trim(),
            quote: testimonialForm.quote.trim(),
        };

        if (payload.name.length < 2 || payload.role.length < 2 || payload.quote.length < 12) {
            toast.error('Lengkapi nama, role, dan testimoni minimal 12 karakter.');
            return;
        }

        setIsSubmittingTestimonial(true);
        try {
            await submitTestimonial(payload);
            setHasSubmittedTestimonial(true);
            localStorage.setItem(TESTIMONIAL_SUBMITTED_STORAGE_KEY, '1');
            setShowTestimonialPrompt(false);
            posthog?.capture('testimonial_submitted', {
                source: 'create_prompt_after_5_generations',
            });
            toast.success('Terima kasih! Testimoni Anda berhasil dikirim.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Gagal mengirim testimoni.';
            toast.error(message);
        } finally {
            setIsSubmittingTestimonial(false);
        }
    }, [posthog, submitTestimonial, testimonialForm]);

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
            variationResults,
            selectedVariationIndex,
            integratedText,
            removeProductBg,
            briefQuestions,
            briefAnswers,
            copyVariations,
            userIntent,
            selectedModelTier,
            manualCopyOverrides,
        };
        localStorage.setItem('smartdesign_create_state', JSON.stringify(stateToSave));
    }, [
        isInitialized, rawText, aspectRatio, currentStep, createMode, redesignStrength,
        parsedData, imageHistory, activeImageIndex, variationResults, selectedVariationIndex, integratedText, removeProductBg,
        briefQuestions, briefAnswers, copyVariations, userIntent, selectedModelTier, manualCopyOverrides
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
            setVariationResults([]);
            setSelectedVariationIndex(0);
            setBriefQuestions([]);
            setBriefAnswers({});
            setManualCopyOverrides(DEFAULT_MANUAL_COPY_OVERRIDES);
            setCopyVariations([]);
            setReferenceFile(null);
            setReferencePreview(null);
            setRemoveProductBg(false);
            setUserIntent(null);
            setSelectedModelTier("auto");
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
        if (localStorage.getItem(FIRST_IMAGE_UPLOAD_STORAGE_KEY) !== "1") {
            trackEvent(posthog, "first_image_uploaded", {
                source: "create_flow",
                file_type: file.type || "unknown",
                file_size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
            });
            localStorage.setItem(FIRST_IMAGE_UPLOAD_STORAGE_KEY, "1");
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setReferencePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    }, [posthog]);

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
        posthog?.capture('create_brief_submitted', { create_mode: createMode });
        trackEvent(posthog, "prompt_submitted", {
            source: "create_flow",
            create_mode: createMode,
            has_brand_kit: brandKitEnabled,
            has_reference_image: Boolean(referenceFile),
        });
        const normalizedHeadlineOverride = normalizeOptionalCopyValue(manualCopyOverrides.headlineOverride);
        const normalizedSubHeadlineOverride = normalizeOptionalCopyValue(manualCopyOverrides.subHeadlineOverride);
        const normalizedCtaOverride = normalizeOptionalCopyValue(manualCopyOverrides.ctaOverride);
        const normalizedProductName = normalizeOptionalCopyValue(manualCopyOverrides.productName);
        const normalizedOfferText = normalizeOptionalCopyValue(manualCopyOverrides.offerText);
        try {
            const [parsed, copywritingData] = await Promise.allSettled([
                parseDesignText({
                    raw_text: rawText,
                    aspect_ratio: normalizeAspectRatio(aspectRatio),
                    num_variations: 2,
                    integrated_text: integratedText,
                    clarification_answers: answers,
                    headline_override: normalizedHeadlineOverride,
                    sub_headline_override: normalizedSubHeadlineOverride,
                    cta_override: normalizedCtaOverride,
                    product_name: normalizedProductName,
                    offer_text: normalizedOfferText,
                    use_ai_copy_assist: manualCopyOverrides.useAiCopyAssist,
                }),
                generateCopywriting({
                    product_description: rawText,
                    tone: "persuasive",
                    brand_name: (activeBrandKit && brandKitEnabled) ? activeBrandKit.name : undefined,
                    clarification_answers: answers
                })
            ]);

            if (parsed.status === 'rejected') {
                throw parsed.reason instanceof Error
                    ? parsed.reason
                    : new Error("Failed to parse visual design text");
            }
            setParsedData(parsed.value);
            posthog?.capture('create_prompt_parsed', { create_mode: createMode });

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
    }, [rawText, aspectRatio, integratedText, manualCopyOverrides, activeBrandKit, brandKitEnabled, parseDesignText, generateCopywriting, createMode, posthog, referenceFile]);

    const handleAnalyze = useCallback(async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        setParsedData(null);
        setBriefQuestions([]);
        setBriefAnswers({});
        posthog?.capture('create_analyze_started', { create_mode: createMode, has_brand_kit: brandKitEnabled });

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
    }, [rawText, createMode, clarifyUnified, handleGeneratePrompt, brandKitEnabled, posthog]);

    // Helper to populate variation state from API response
    const _populateVariationState = useCallback((statusData: {
        result_url?: string | null;
        quantum_layout?: string | null;
        variation_results?: string | null;
    }, finalPrompt: string) => {
        const newUrl = statusData.result_url!;
        
        // Parse variation_results from API
        let parsedVariations: VariationResult[] = [];
        try {
            if (statusData.variation_results) {
                parsedVariations = JSON.parse(statusData.variation_results);
            }
        } catch { /* keep empty */ }

        // Fallback: legacy single-result → synthetic 1-variation bundle
        if (parsedVariations.length === 0 && newUrl) {
            parsedVariations = [{
                set_num: 1,
                result_url: newUrl,
                composition: { set_num: 1, ratio: "1:1", copy_space_side: "auto" },
                image_prompt_modifier: "",
                layout_elements: [],
            }];
        }

        setVariationResults(parsedVariations);
        setSelectedVariationIndex(0);

        // Populate imageHistory from variation bundle for backward compat
        const historyItems = parsedVariations
            .filter(v => v.result_url)
            .map(v => ({ url: v.result_url!, prompt: finalPrompt }));
        
        setImageHistory(prev => {
            const newHistory = [...prev, ...historyItems];
            setActiveImageIndex(newHistory.length > 0 ? newHistory.length - 1 : 0);
            return newHistory;
        });

        setParsedData(prev => prev ? {
            ...prev,
            generated_image_url: newUrl,
            quantum_layout: statusData.quantum_layout || undefined,
            variation_results: parsedVariations.length > 0 ? parsedVariations : undefined,
        } : {
            layout_instruction: "Placeholder layout",
            visual_prompt: finalPrompt,
            image_caption: "Generated design", 
            indonesian_translation: finalPrompt,
            generated_image_url: newUrl,
            quantum_layout: statusData.quantum_layout || undefined,
            variation_results: parsedVariations.length > 0 ? parsedVariations : undefined,
        });
        setCurrentStep('preview');
        posthog?.capture('create_generation_success', { create_mode: createMode });
        posthog?.capture('design_generated', {
            create_mode: createMode,
            aspect_ratio: normalizeAspectRatio(aspectRatio),
            quality: selectedModelTier,
        });
        trackEvent(posthog, "generation_succeeded", {
            source: "create_flow",
            create_mode: createMode,
            aspect_ratio: normalizeAspectRatio(aspectRatio),
            quality: selectedModelTier,
            result_count: parsedVariations.length || 1,
            status: "success",
        });
        if (localStorage.getItem(FIRST_DESIGN_CREATED_STORAGE_KEY) !== "1") {
            trackEvent(posthog, "first_design_created", {
                source: "create_flow",
                create_mode: createMode,
                aspect_ratio: normalizeAspectRatio(aspectRatio),
                quality: selectedModelTier,
            });
            localStorage.setItem(FIRST_DESIGN_CREATED_STORAGE_KEY, "1");
        }
        recordDesignGenerated();
    }, [aspectRatio, selectedModelTier, createMode, posthog, recordDesignGenerated]);

    const handleGenerateImage = useCallback(async () => {
        if (!parsedData && createMode !== 'redesign') return;
        
        setIsGeneratingImage(true);
        setCurrentStep('generating');
        posthog?.capture('create_generation_started', { create_mode: createMode, aspect_ratio: aspectRatio });

        try {
            let assembledPrompt = rawText;
            if (parsedData?.visual_prompt_parts && parsedData.visual_prompt_parts.length > 0) {
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
            const normalizedHeadlineOverride = normalizeOptionalCopyValue(manualCopyOverrides.headlineOverride);
            const normalizedSubHeadlineOverride = normalizeOptionalCopyValue(manualCopyOverrides.subHeadlineOverride);
            const normalizedCtaOverride = normalizeOptionalCopyValue(manualCopyOverrides.ctaOverride);
            const normalizedProductName = normalizeOptionalCopyValue(manualCopyOverrides.productName);
            const normalizedOfferText = normalizeOptionalCopyValue(manualCopyOverrides.offerText);
            let jobData;

            if (createMode === 'redesign') {
                if (!uploadedReferenceUrl) {
                    throw new Error("Gambar referensi wajib diunggah untuk fitur Redesign.");
                }
                const redesignPayload = {
                    reference_image_url: uploadedReferenceUrl,
                    raw_text: finalPrompt,
                    strength: redesignStrength,
                    aspect_ratio: normalizeAspectRatio(aspectRatio),
                    quality: selectedModelTier,
                    brand_kit_id: undefined as string | undefined
                };
                if (activeBrandKit && brandKitEnabled) {
                    redesignPayload.brand_kit_id = activeBrandKit.id;
                }
                jobData = await redesignFromReference(redesignPayload);
            } else {
                const generateDesignPayload = {
                    raw_text: finalPrompt,
                    aspect_ratio: normalizeAspectRatio(aspectRatio),
                    reference_image_url: uploadedReferenceUrl,
                    integrated_text: integratedText,
                    remove_product_bg: removeProductBg && !!uploadedReferenceUrl,
                    product_image_url: removeProductBg ? uploadedReferenceUrl : undefined,
                    headline_override: normalizedHeadlineOverride,
                    sub_headline_override: normalizedSubHeadlineOverride,
                    cta_override: normalizedCtaOverride,
                    product_name: normalizedProductName,
                    offer_text: normalizedOfferText,
                    use_ai_copy_assist: manualCopyOverrides.useAiCopyAssist,
                    quality: selectedModelTier,
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
                    _populateVariationState(statusData, finalPrompt);
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

                    if (statusData.status === "completed" && statusData.result_url) {
                        isComplete = true;
                        _populateVariationState(statusData, finalPrompt);
                    } else if (statusData.status === "completed") {
                        throw new Error("Generation completed without image result");
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
            posthog?.capture('create_generation_failed', { create_mode: createMode, error_message: errorMessage });
            trackEvent(posthog, "generation_failed", {
                source: "create_flow",
                create_mode: createMode,
                aspect_ratio: normalizeAspectRatio(aspectRatio),
                quality: selectedModelTier,
                error_message: errorMessage,
                status: "failed",
            });
            
            // For redesign mode, parsedData is null so 'results' step would fall through
            // to the home screen. Instead, go back to 'input' to keep the form visible.
            setCurrentStep(createMode === 'redesign' || !parsedData ? 'input' : 'results');
            
            if (errorMessage.toLowerCase().includes("pelanggaran") || errorMessage.toLowerCase().includes("safety") || errorMessage.toLowerCase().includes("nsfw")) {
                setErrorModalState({
                    isOpen: true,
                    title: "Brief Perlu Disesuaikan",
                    description: errorMessage,
                    type: "safety",
                    actionLabel: "Ubah Brief",
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
                    actionLabel: "Upgrade Storage",
                    onAction: () => {
                        setErrorModalState(prev => ({ ...prev, isOpen: false }));
                        router.push('/settings?upgrade=storage');
                    }
                });
            } else if (errorMessage.toLowerCase().includes("kredit") || errorMessage.toLowerCase().includes("credit")) {
                setErrorModalState({
                    isOpen: true,
                    title: "Kredit Belum Cukup",
                    description: errorMessage.includes("kredit") ? errorMessage : "Kredit Anda belum cukup untuk membuat hasil AI ini. Tambahkan kredit lalu coba lagi.",
                    type: "credits",
                    actionLabel: "Tambah Kredit",
                    onAction: () => {
                        setErrorModalState(prev => ({ ...prev, isOpen: false }));
                        router.push('/settings');
                    }
                });
            } else if (errorMessage.toLowerCase().includes("timed out") || errorMessage.toLowerCase().includes("timeout")) {
                setInlineError({
                    message: "Pembuatan hasil pertama memakan waktu terlalu lama. Jangan khawatir, kredit Anda tidak terpotong.",
                    type: "warning",
                    onRetry: () => {
                        setInlineError(null);
                        handleGenerateImage();
                    }
                });
            } else if (errorMessage.toLowerCase().includes("validation error") || errorMessage.toLowerCase().includes("bad request")) {
                setInlineError({
                    message: "Ada ketidaksesuaian pada detail permintaan AI. Periksa brief Anda lalu coba langkah ini lagi.",
                    type: "error",
                    onRetry: () => {
                        setInlineError(null);
                        handleGenerateImage();
                    }
                });
            } else {
                setInlineError({
                    message: `Kami belum berhasil menyiapkan hasil Anda: ${errorMessage}`,
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
    }, [parsedData, rawText, referenceFile, aspectRatio, integratedText, removeProductBg, manualCopyOverrides, activeBrandKit, brandKitEnabled, createMode, redesignStrength, selectedModelTier, getStorageUsage, uploadImage, generateDesign, redesignFromReference, getJobStatus, router, posthog, _populateVariationState]);

    const handleProceedToEditor = useCallback(async () => {
        if (!parsedData) return;
        
        const activeImageUrl = imageHistory[activeImageIndex]?.url || parsedData.generated_image_url;
        
        setIsSaving(true);
        try {
            let finalAspectRatio = aspectRatio;
            let variants: Record<string, string> | undefined = undefined;
            
            // If "all" format selected, generate multi-format variants
            if (aspectRatio === "all" && activeImageUrl) {
                try {
                    const multiResult = await generateMultiFormat(activeImageUrl);
                    if (multiResult.variants) {
                        variants = multiResult.variants;
                    }
                } catch (variantErr) {
                    console.warn("Failed to generate multi-format variants:", variantErr);
                    // Continue with main image — variants are best-effort
                }
            }
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
                    parsedData.quantum_layout ? JSON.parse(parsedData.quantum_layout) : undefined,
                    selectedVariationIndex,
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
                    originalPrompt: parsedData.visual_prompt || rawText,
                    multiFormatVariants: variants || null,
                    workflow: {
                        sourceTool: "create",
                        entryMode: createMode === "redesign" ? "legacy_redesign" : "legacy_create",
                        intent: userIntent,
                        copyVariants: copyVariations,
                    }
                }
            });

            posthog?.capture('create_proceed_to_editor', { create_mode: createMode });
            router.push(`/edit/${newProject.id}`);
        } catch (error) {
            console.error('Failed to create project', error);
            toast.error('Gagal melanjutkan ke editor. Silakan coba lagi.');
            setIsSaving(false);
        }
    }, [parsedData, imageHistory, activeImageIndex, aspectRatio, integratedText, rawText, generateProjectTitle, saveProject, router, copyVariations, createMode, posthog, userIntent, generateMultiFormat, selectedVariationIndex]);

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
        manualCopyOverrides,
        updateManualCopyOverrides,
        headlineLengthWarning,
        removeProductBg, setRemoveProductBg,
        copyVariations, setCopyVariations,
        errorModalState, setErrorModalState,
        inlineError, setInlineError,
        activeBrandKit, setActiveBrandKit,
        imageHistory, setImageHistory,
        activeImageIndex, setActiveImageIndex,
        variationResults, setVariationResults,
        selectedVariationIndex, setSelectedVariationIndex,
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
        setBrandKitEnabled,
        userIntent,
        setUserIntent,
        selectedModelTier,
        setSelectedModelTier,
        modelCatalog,
        generatedDesignCount,
        showTestimonialPrompt,
        setShowTestimonialPrompt,
        testimonialForm,
        setTestimonialForm,
        isSubmittingTestimonial,
        hasSubmittedTestimonial,
        handleSubmitTestimonialPrompt,
    };
}
