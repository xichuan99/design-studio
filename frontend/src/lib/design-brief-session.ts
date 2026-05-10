export const DESIGN_BRIEF_SESSION_KEY = "smartdesign_design_brief_v1";

export interface CatalogPagePlanState {
    page_number: number;
    type: string;
    layout: string;
    content: Record<string, unknown>;
}

export interface CatalogStyleOptionState {
    style: string;
    description: string;
    use_case: string;
    layout: string;
}

export interface CatalogImageMappingState {
    image_id: string;
    category: string;
    confidence: number;
    recommended_pages: number[];
}

export interface CatalogFinalPlanState {
    schema_version: string;
    catalog_type: "product" | "service";
    total_pages: number;
    tone: "formal" | "fun" | "premium" | "soft_selling";
    style: string;
    pages: CatalogPagePlanState[];
    missing_data: string[];
}

export interface DesignBriefSessionState {
    goal: string;
    productType: string;
    customProductType?: string;
    style: string;
    channel: string;
    copyTone: string;
    headlineOverride?: string;
    subHeadlineOverride?: string;
    ctaOverride?: string;
    productName?: string;
    offerText?: string;
    useAiCopyAssist?: boolean;
    notes?: string;
    productImageUrl?: string;
    productImageFilename?: string;
    referenceFocus?: "auto" | "human" | "object";
    catalogType?: "product" | "service";
    catalogTotalPages?: number;
    catalogSuggestedStructure?: CatalogPagePlanState[];
    catalogStyleOptions?: CatalogStyleOptionState[];
    catalogSelectedStyle?: string;
    catalogImageMapping?: CatalogImageMappingState[];
    catalogGeneratedPages?: CatalogPagePlanState[];
    catalogFinalPlan?: CatalogFinalPlanState;
    catalogRenderJobId?: string;
    catalogRenderStatus?: "queued" | "processing" | "completed" | "failed" | "canceled";
    catalogRenderZipUrl?: string;
    catalogRenderedPages?: Array<{
        page_number: number;
        status: "completed" | "failed" | "fallback";
        result_url?: string | null;
        fallback_used?: boolean;
        error_message?: string | null;
    }>;
    updatedAt: string;
}