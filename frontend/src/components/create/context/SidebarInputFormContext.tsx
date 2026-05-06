import { createContext, useContext } from "react";
import { BrandKit, type ModelCatalogItem, type ModelTier } from "@/lib/api";
import type { CreateStep } from "@/app/create/hooks/useCreateDesign";
import type { UserIntent } from "@/app/create/types";

export interface SidebarInputFormContextValue {
    createMode: "generate" | "redesign";
    setCreateMode: (val: "generate" | "redesign") => void;
    redesignStrength: number;
    setRedesignStrength: (val: number) => void;
    rawText: string;
    setRawText: (val: string) => void;
    isInputLocked: boolean;
    isParsing: boolean;
    aspectRatio: string;
    setAspectRatio: (val: string) => void;
    integratedText: boolean;
    setIntegratedText: (val: boolean) => void;
    selectedModelTier: ModelTier;
    setSelectedModelTier: (val: ModelTier) => void;
    modelCatalog: ModelCatalogItem[];
    onModelSelectorOpened: () => void;
    onModelTierSelected: (val: ModelTier) => void;
    removeProductBg: boolean;
    setRemoveProductBg: (val: boolean) => void;
    showManualRef: boolean;
    setShowManualRef: (val: boolean) => void;
    referenceFile: File | null;
    referencePreview: string | null;
    isDragOver: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveFile: () => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    activeBrandKit: BrandKit | null;
    brandKitEnabled: boolean;
    setBrandKitEnabled: (val: boolean) => void;
    currentStep: CreateStep;
    userIntent: UserIntent;
    intentFirstEnabled?: boolean;
}

const SidebarInputFormContext = createContext<SidebarInputFormContextValue | null>(null);

interface SidebarInputFormProviderProps extends SidebarInputFormContextValue {
    children: React.ReactNode;
}

export function SidebarInputFormProvider({ children, ...value }: SidebarInputFormProviderProps) {
    return (
        <SidebarInputFormContext.Provider value={value}>
            {children}
        </SidebarInputFormContext.Provider>
    );
}

export function useSidebarInputFormContext() {
    const context = useContext(SidebarInputFormContext);
    if (!context) {
        throw new Error("useSidebarInputFormContext must be used within SidebarInputFormProvider");
    }
    return context;
}
