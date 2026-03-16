"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Loader2, PanelLeftOpen, PanelLeftClose, ImagePlus } from "lucide-react";
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

export default function CreatePage() {
    const { status } = useSession();

    const {
        rawText, setRawText,
        aspectRatio, setAspectRatio,
        stylePreference, setStylePreference,
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
        copyVariations,
        errorModalState, setErrorModalState,
        inlineError, setInlineError,
        activeBrandKit,
        imageHistory,
        activeImageIndex, setActiveImageIndex,
        showManualRef, setShowManualRef,
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
        handleProceedToEditor
    } = useCreateDesign();

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
