"use client";

import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Loader2, PanelLeftOpen, PanelLeftClose, X } from "lucide-react";
import { usePostHog } from 'posthog-js/react';
import { useProjectApi, ProjectPayload } from "@/lib/api";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { AppHeader } from "@/components/layout/AppHeader";
import { GenerationProgress } from "@/components/create/GenerationProgress";
import { SidebarInputForm } from "@/components/create/SidebarInputForm";
import { DesignBriefInterview } from "@/components/create/DesignBriefInterview";
import { SidebarActionBar } from "@/components/create/SidebarActionBar";
import { UnifiedPreviewEditor } from "@/components/create/UnifiedPreviewEditor";
import { UnifiedResultsView } from "@/components/create/UnifiedResultsView";
import { RedesignPlaceholder } from "@/components/create/RedesignPlaceholder";
import { IntentFirstSelector } from "@/components/create/IntentFirstSelector";
import { LegacyIntentGrid } from "@/components/create/LegacyIntentGrid";
import { TestimonialDialog } from "@/components/create/TestimonialDialog";
import { ErrorModal } from "@/components/feedback/ErrorModal";
import { InlineErrorBanner } from "@/components/feedback/InlineErrorBanner";
import { BrandSwitcher } from '@/components/editor/BrandSwitcher';
import { SidebarInputFormProvider } from "@/components/create/context/SidebarInputFormContext";
import { useCreateDesign } from "./hooks/useCreateDesign";
import { INTENT_FIRST_ENTRY_ENABLED, START_HUB_ENABLED } from "@/lib/feature-flags";

function LegacyCreatePage() {
    const { status } = useSession();
    const posthog = usePostHog();
    const { getProjects } = useProjectApi();
    const [latestProject, setLatestProject] = useState<ProjectPayload | null>(null);
    const [isLoadingProject, setIsLoadingProject] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchLatest = async () => {
            if (status !== 'authenticated') return;
            try {
                const projects = await getProjects();
                if (isMounted && projects && projects.length > 0) {
                    setLatestProject(projects[0]);
                }
            } catch (e) {
                console.error("Failed to fetch latest project:", e);
            } finally {
                if (isMounted) setIsLoadingProject(false);
            }
        };
        fetchLatest();
        return () => { isMounted = false; };
    }, [status, getProjects]);

    const {
        rawText, setRawText,
        aspectRatio, setAspectRatio,
        createMode, setCreateMode,
        redesignStrength, setRedesignStrength,
        currentStep, setCurrentStep,
        isParsing,
        isGeneratingImage,
        isSaving,
        parsedData, setParsedData,
        referenceFile,
        referencePreview,
        isDragOver,
        sidebarOpen, setSidebarOpen,
        integratedText, setIntegratedText,
        briefQuestions,
        manualCopyOverrides,
        updateManualCopyOverrides,
        headlineLengthWarning,
        removeProductBg, setRemoveProductBg,
        errorModalState, setErrorModalState,
        inlineError, setInlineError,
        activeBrandKit,
        imageHistory,
        activeImageIndex, setActiveImageIndex,
        variationResults,
        selectedVariationIndex, setSelectedVariationIndex,
        showManualRef, setShowManualRef,
        userIntent,
        fileInputRef,
        isInputLocked,
        handleTogglePromptPart,
        handleResetState,
        handleFileInputChange,
        handleRemoveFile,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleAnalyze,
        handleGeneratePrompt,
        handleGenerateImage,
        handleProceedToEditor,
        brandKitEnabled, setBrandKitEnabled,
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
    } = useCreateDesign();

    const handleModelSelectorOpened = () => {
        posthog?.capture('model_selector_opened', { create_mode: createMode });
    };

    const handleModelTierSelected = (tier: "auto" | "basic" | "pro" | "ultra") => {
        posthog?.capture('model_tier_selected', { create_mode: createMode, tier });
    };

    const mobileStepLabel = currentStep === 'brief'
        ? 'Lengkapi brief'
        : currentStep === 'results'
            ? 'Review arahan visual'
            : currentStep === 'generating'
                ? 'AI sedang menyiapkan hasil'
                : currentStep === 'preview'
                    ? 'Pilih hasil terbaik'
                    : createMode === 'redesign'
                        ? 'Atur redesign dari foto'
                        : 'Mulai dari brief';

    const mobileStepHint = currentStep === 'preview'
        ? 'Buka panel kiri jika ingin mengubah brief atau pengaturan hasil.'
        : currentStep === 'results'
            ? 'Periksa arahan visual dulu sebelum membuat hasil pertama.'
            : currentStep === 'generating'
                ? 'Tunggu sampai hasil pertama siap ditinjau.'
                : 'Buka panel kiri untuk mengatur brief, foto, dan format hasil.';

    if (status === "loading") {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <OnboardingTour />
            <AppHeader
                renderActions={() => (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <BrandSwitcher />
                        </div>
                    </div>
                )}
            />

            <div className="border-b bg-background/90 px-4 py-3 backdrop-blur-sm md:hidden">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{mobileStepLabel}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{mobileStepHint}</p>
                    </div>
                    <button
                        type="button"
                        className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                        onClick={() => setSidebarOpen(true)}
                    >
                        Buka Panel
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile sidebar toggle */}
                <button
                    className="md:hidden absolute top-3 left-3 z-30 bg-card border rounded-lg p-3 min-w-[44px] min-h-[44px] flex items-center justify-center shadow-md hover:bg-muted transition-colors"
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
                <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 absolute md:relative w-full max-w-[420px] md:w-[420px] border-r flex flex-col bg-card shrink-0 z-20 shadow-xl h-full transition-transform duration-200`}>
                    <div className="md:hidden flex items-start justify-between gap-3 border-b px-4 py-3 bg-background/90 backdrop-blur-sm">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Panel Brief</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Atur tujuan desain, foto acuan, dan format hasil di sini.</p>
                        </div>
                        <button
                            type="button"
                            className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Tutup panel"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-4 space-y-6 flex-1 overflow-y-auto relative">
                        <SidebarInputFormProvider
                            createMode={createMode}
                            setCreateMode={setCreateMode}
                            redesignStrength={redesignStrength}
                            setRedesignStrength={setRedesignStrength}
                            rawText={rawText}
                            setRawText={setRawText}
                            isInputLocked={isInputLocked}
                            isParsing={isParsing}
                            aspectRatio={aspectRatio}
                            setAspectRatio={setAspectRatio}
                            integratedText={integratedText}
                            setIntegratedText={setIntegratedText}
                            manualCopyOverrides={manualCopyOverrides}
                            updateManualCopyOverrides={updateManualCopyOverrides}
                            headlineLengthWarning={headlineLengthWarning}
                            selectedModelTier={selectedModelTier}
                            setSelectedModelTier={setSelectedModelTier}
                            modelCatalog={modelCatalog}
                            onModelSelectorOpened={handleModelSelectorOpened}
                            onModelTierSelected={handleModelTierSelected}
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
                            brandKitEnabled={brandKitEnabled}
                            setBrandKitEnabled={setBrandKitEnabled}
                            currentStep={currentStep}
                            userIntent={userIntent}
                            intentFirstEnabled={INTENT_FIRST_ENTRY_ENABLED}
                        >
                            <SidebarInputForm />
                        </SidebarInputFormProvider>
                    </div>

                    <SidebarActionBar
                        currentStep={currentStep}
                        isParsing={isParsing}
                        rawText={rawText}
                        isInputLocked={isInputLocked}
                        onAnalyze={handleAnalyze}
                        onBackToInput={() => setCurrentStep('input')}
                        createMode={createMode}
                        referenceFile={referenceFile}
                        onGenerateDirectly={handleGenerateImage}
                    />
                </aside>

                {/* Main Workspace Preview */}
                <main className={`flex-1 bg-muted/20 relative flex flex-col items-center justify-start ${currentStep === 'preview' ? 'overflow-hidden p-0' : 'overflow-y-auto p-4 md:p-8'}`}>
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
                            onGenerate={handleGenerateImage}
                            isGeneratingImage={isGeneratingImage}
                        />
                    ) : currentStep === 'preview' && parsedData ? (
                        <UnifiedPreviewEditor
                            parsedData={parsedData}
                            imageHistory={imageHistory}
                            activeImageIndex={activeImageIndex}
                            setActiveImageIndex={setActiveImageIndex}
                            variationResults={variationResults}
                            selectedVariationIndex={selectedVariationIndex}
                            setSelectedVariationIndex={setSelectedVariationIndex}
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
                            onReset={handleResetState}
                        />
                    ) : currentStep === 'generating' ? (
                        <GenerationProgress />
                    ) : isParsing ? (
                        <div className="max-w-2xl w-full mx-auto h-full flex flex-col items-center justify-center animation-fade-in">
                            <div className="text-center space-y-4">
                                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto opacity-80" />
                                <h2 className="text-2xl font-bold tracking-tight">AI Sedang Fokus 👀</h2>
                                <p className="text-muted-foreground max-w-sm">
                                    Menganalisis deskripsi Kamu untuk menentukan struktur desain yang paling pas secara semantik...
                                </p>
                            </div>
                        </div>
                    ) : createMode === 'redesign' ? (
                        <RedesignPlaceholder
                            referencePreview={referencePreview}
                            setSidebarOpen={setSidebarOpen}
                            setShowManualRef={setShowManualRef}
                        />
                    ) : (
                        <div className="max-w-4xl w-full mx-auto h-full flex flex-col items-center justify-center animation-fade-in px-4">
                            <h2 className="text-3xl font-bold mb-8 text-center text-foreground">
                                {INTENT_FIRST_ENTRY_ENABLED ? "Apa tujuan desain Kamu hari ini?" : "Apa tujuan desain Kamu?"}
                            </h2>

                            {INTENT_FIRST_ENTRY_ENABLED ? (
                                <IntentFirstSelector
                                    setUserIntent={setUserIntent}
                                    setCreateMode={setCreateMode}
                                    setSidebarOpen={setSidebarOpen}
                                    setShowManualRef={setShowManualRef}
                                />
                            ) : (
                                <LegacyIntentGrid
                                    setCreateMode={setCreateMode}
                                    setSidebarOpen={setSidebarOpen}
                                    setShowManualRef={setShowManualRef}
                                    latestProject={latestProject}
                                    isLoadingProject={isLoadingProject}
                                />
                            )}
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

            <TestimonialDialog
                open={showTestimonialPrompt}
                onOpenChange={setShowTestimonialPrompt}
                generatedDesignCount={generatedDesignCount}
                hasSubmitted={hasSubmittedTestimonial}
                testimonialForm={testimonialForm}
                setTestimonialForm={setTestimonialForm}
                isSubmitting={isSubmittingTestimonial}
                onSubmit={handleSubmitTestimonialPrompt}
            />
        </div>
    );
}

function CreatePageContent() {
    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const legacyRequested = searchParams.get("legacy") === "1";
    const shouldUseLegacyRoute = !INTENT_FIRST_ENTRY_ENABLED || legacyRequested;

    useEffect(() => {
        if (status !== "authenticated") return;
        if (shouldUseLegacyRoute) return;
        router.replace(START_HUB_ENABLED ? "/start" : "/design/new/interview");
    }, [router, shouldUseLegacyRoute, status]);

    if (status === "loading") {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
    }

    if (status === "unauthenticated") {
        redirect("/");
    }

    if (!shouldUseLegacyRoute) {
        return (
            <div className="flex h-screen items-center justify-center bg-background px-6">
                <div className="text-center space-y-3">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <h1 className="text-xl font-semibold text-foreground">Mengalihkan ke flow desain baru</h1>
                    <p className="max-w-md text-sm text-muted-foreground">
                        Route utama sekarang memakai jalur baru berbasis brief bertahap. Engine lama hanya dipakai untuk handoff gambar atau fallback transisi.
                    </p>
                </div>
            </div>
        );
    }

    return <LegacyCreatePage />;
}

function CreatePageFallback() {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;
}

export default function CreatePage() {
    return (
        <Suspense fallback={<CreatePageFallback />}>
            <CreatePageContent />
        </Suspense>
    );
}
