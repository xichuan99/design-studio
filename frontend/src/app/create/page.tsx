"use client";

import { Suspense, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { Loader2, PanelLeftOpen, PanelLeftClose, ImagePlus, Wand2, Sparkles, Clock, Scissors, X, PanelsTopLeft, ChevronDown } from "lucide-react";
import { usePostHog } from 'posthog-js/react';
import { toast } from "sonner";
import { useProjectApi, ProjectPayload } from "@/lib/api";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { AppHeader } from "@/components/layout/AppHeader";
import { GenerationProgress } from "@/components/create/GenerationProgress";
import { SidebarInputForm } from "@/components/create/SidebarInputForm";
import { DesignBriefInterview } from "@/components/create/DesignBriefInterview";
import { SidebarActionBar } from "@/components/create/SidebarActionBar";
import { UnifiedPreviewEditor } from "@/components/create/UnifiedPreviewEditor";
import { UnifiedResultsView } from "@/components/create/UnifiedResultsView";
import { ErrorModal } from "@/components/feedback/ErrorModal";
import { InlineErrorBanner } from "@/components/feedback/InlineErrorBanner";
import { BrandSwitcher } from '@/components/editor/BrandSwitcher';
import { useCreateDesign } from "./hooks/useCreateDesign";
import { INTENT_FIRST_ENTRY_ENABLED, START_HUB_ENABLED } from "@/lib/feature-flags";

function LegacyCreatePage() {
    const { status } = useSession();
    const router = useRouter();
    const posthog = usePostHog();
    const { getProjects, saveProject } = useProjectApi();
    const [latestProject, setLatestProject] = useState<ProjectPayload | null>(null);
    const [isLoadingProject, setIsLoadingProject] = useState(true);
    const [showExtendedCreateOptions, setShowExtendedCreateOptions] = useState(false);

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
        removeProductBg, setRemoveProductBg,
        errorModalState, setErrorModalState,
        inlineError, setInlineError,
        activeBrandKit,
        imageHistory,
        activeImageIndex, setActiveImageIndex,
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
        setUserIntent
    } = useCreateDesign();

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
                        <SidebarInputForm
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
                        />
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
                                    Menganalisis deskripsi Anda untuk menentukan struktur desain yang paling pas secara semantik...
                                </p>
                            </div>
                        </div>
                    ) : createMode === 'redesign' ? (
                        <div className="max-w-4xl w-full mx-auto h-full flex flex-col items-center justify-center animation-fade-in px-4">
                            <div className="w-full max-w-2xl bg-card border rounded-3xl p-8 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-4 right-4 z-10 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                    Redesign Target
                                </div>
                                
                                {referencePreview ? (
                                    <div className="space-y-6">
                                        <div className="aspect-square w-full max-w-[400px] mx-auto relative rounded-2xl overflow-hidden border shadow-inner bg-muted/30">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img 
                                                src={referencePreview} 
                                                alt="Reference Preview" 
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h2 className="text-2xl font-bold tracking-tight">Foto acuan sudah siap</h2>
                                            <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                                Lengkapi arah perubahan di panel kiri, lalu mulai redesign untuk melihat hasil pertama yang siap Anda rapikan di editor.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 space-y-6">
                                        <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                                            <ImagePlus className="w-12 h-12 text-indigo-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <h2 className="text-2xl font-bold tracking-tight">Mulai dari foto yang ingin diubah</h2>
                                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                                Redesign bekerja dari gambar acuan. Unggah satu foto dulu, lalu tentukan hasil akhir yang Anda inginkan.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setShowManualRef(true);
                                                setSidebarOpen(true);
                                            }}
                                            className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold transition-all shadow-md active:scale-95"
                                        >
                                            Unggah Sekarang
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : ( 
                        <div className="max-w-4xl w-full mx-auto h-full flex flex-col items-center justify-center animation-fade-in px-4">
                            <h2 className="text-3xl font-bold mb-8 text-center text-foreground">
                                {INTENT_FIRST_ENTRY_ENABLED ? "Apa tujuan desain Anda hari ini?" : "Apa tujuan desain Anda?"}
                            </h2>
                            
                            {INTENT_FIRST_ENTRY_ENABLED ? (
                                <div className="w-full max-w-5xl space-y-5">
                                    <button
                                        onClick={async () => {
                                            setUserIntent('ad_from_photo');
                                            setCreateMode('redesign');
                                            setSidebarOpen(true);
                                            setShowManualRef(true);
                                            posthog?.capture('intent_selected', { intent: 'ad_from_photo' });
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
                                                setUserIntent('clean_photo');
                                                const toastId = toast.loading("Membuka Studio...");
                                                try {
                                                    const newProject = await saveProject({
                                                        title: "Rapikan Foto",
                                                        status: "draft",
                                                        aspect_ratio: "1:1",
                                                        canvas_state: {
                                                            elements: [],
                                                            backgroundUrl: null,
                                                            backgroundColor: "#ffffff"
                                                        }
                                                    });
                                                    toast.dismiss(toastId);
                                                    posthog?.capture('intent_selected', { intent: 'clean_photo' });
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
                                                setUserIntent('content_from_text');
                                                setCreateMode('generate');
                                                setSidebarOpen(true);
                                                posthog?.capture('intent_selected', { intent: 'content_from_text' });
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
                                                        posthog?.capture('intent_selected', { intent: 'carousel_instagram' });
                                                        router.push('/create/carousel');
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
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                                    <button
                                        onClick={() => {
                                            setCreateMode('generate');
                                            setSidebarOpen(true);
                                        }}
                                        className="group flex flex-col items-center text-center p-8 bg-card border shadow-sm hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 rounded-3xl transition-all"
                                    >
                                        <div className="w-20 h-20 mb-6 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                            <Wand2 className="w-10 h-10 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 text-foreground">Buat dari Teks</h3>
                                        <p className="text-muted-foreground leading-relaxed text-sm">
                                            Deskripsikan ide visual Anda, lalu AI meracik komposisi yang bisa Anda lanjutkan di editor.
                                        </p>
                                    </button>
                                    
                                    <button
                                        onClick={() => {
                                            setCreateMode('redesign');
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
                                    
                                    {/* Fast ad concept card */}
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
                                                        backgroundColor: "#ffffff"
                                                    }
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

                                    {/* Proyek Terakhir Card */}
                                    <button
                                        onClick={() => {
                                            if (latestProject) {
                                                router.push(`/edit/${latestProject.id}`);
                                            } else {
                                                router.push('/projects');
                                            }
                                        }}
                                        className={`group flex flex-col items-center justify-center text-center p-8 bg-card border shadow-sm hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 rounded-3xl transition-all ${!latestProject && !isLoadingProject ? 'opacity-70' : ''}`}
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
                                            {isLoadingProject ? "Sedang mengambil data proyek Anda..." : latestProject ? `Lanjutkan edit "${latestProject.title}" yang terakhir Anda kerjakan, tanpa perlu ke halaman Projects.` : "Anda belum memiliki proyek. Mulai dengan membuat desain baru."}
                                        </p>
                                    </button>
                                </div>
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
        </div>
    );
}

function CreatePageContent() {
    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const hasImageHandoff = Boolean(searchParams.get("imageUrl"));
    const legacyRequested = searchParams.get("legacy") === "1";
    const shouldUseLegacyRoute = !INTENT_FIRST_ENTRY_ENABLED || hasImageHandoff || legacyRequested;

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
