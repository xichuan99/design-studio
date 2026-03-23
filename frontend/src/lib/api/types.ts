export interface ProjectPayload {
    id?: string;
    title: string;
    canvas_state: object;
    canvas_schema_version?: number;
    status: string;
    aspect_ratio?: string;
}

// --- History Types ---
export interface HistoryEntry {
    id: string;
    project_id: string;
    action_type: string;
    canvas_state?: Record<string, unknown>;
    canvas_schema_version?: number;
    prompt_used?: string;
    created_at: string;
}

// --- Brand Kit Types ---
export type ColorRole = 'background' | 'primary_text' | 'secondary_text' | 'accent' | 'primary' | 'secondary' | string;

export interface Template {
    id: string;
    name: string;
    description: string;
    category: string;
    aspect_ratio: string;
    layout_data: unknown;
    thumbnail_url?: string;
}

export interface ColorSwatch {
    hex: string;
    name: string;
    role: ColorRole;
    reasoning?: string;
    application?: string;
}

export interface TypographyHierarchy {
    size: string;
    weight: string;
    letterSpacing: string;
    fontFamily?: string;
    lineHeight?: string;
    color?: string;
}

export interface Typography {
    primaryFont?: string;
    primaryFontSource?: string;
    primaryFontReasoning?: string;
    primaryFontUse?: string;
    secondaryFont?: string;
    secondaryFontSource?: string;
    secondaryFontReasoning?: string;
    secondaryFontUse?: string;
    hierarchy?: Record<string, TypographyHierarchy>;
}

export interface BrandStrategy {
    personality?: string[];
    targetAudience?: string;
    designStyle?: string;
    differentiator?: string;
}

export interface BrandKit {
    id: string;
    user_id: string;
    name: string;
    logo_url: string | null;
    logos: string[];
    colors: ColorSwatch[];
    typography?: Typography;
    brand_strategy?: BrandStrategy;
    is_active: boolean;
    created_at: string;
}

export interface GenerateBrandKitRequest {
    prompt: string;
    brand_personality?: string[];
    target_audience?: string;
    design_style?: string;
    emotional_tone?: string;
}

// Alias for semantic clarity in hooks and UI
export type BrandKitProfile = BrandKit;

// --- Credit History Types ---
export interface CreditTransaction {
    id: string;
    user_id: string;
    amount: number;
    balance_after: number;
    description: string;
    created_at: string;
}

export interface CreditHistoryResponse {
    transactions: CreditTransaction[];
    total_count: number;
}

// --- Storage Quota Types ---
export interface StorageUsage {
    used: number;
    quota: number;
    percentage: number;
    used_mb: number;
    quota_mb: number;
}

// --- Copywriting Types ---
export interface CopywritingVariation {
    style: string;
    headline: string;
    subline: string;
    cta: string;
    full_text: string;
}

// --- AI Tool Results ---
export interface AiToolResult {
    id: string;
    tool_name: string;
    result_url: string;
    input_summary: string | null;
    file_size: number;
    created_at: string;
}

export type AiToolJobStatus =
    | 'queued'
    | 'uploading'
    | 'processing'
    | 'saving'
    | 'completed'
    | 'failed'
    | 'canceled'
    | 'cancel_requested';

export interface AiToolJob {
    job_id: string;
    tool_name: string;
    status: AiToolJobStatus;
    progress_percent: number;
    phase_message: string | null;
    result_url: string | null;
    error_message: string | null;
    cancel_requested: boolean;
    created_at: string;
    started_at: string | null;
    finished_at: string | null;
    result_meta?: Record<string, unknown> | null;
}

export type AiToolJobName =
    | 'upscale'
    | 'retouch'
    | 'background_swap'
    | 'product_scene'
    | 'generative_expand'
    | 'batch'
    | 'id_photo'
    | 'magic_eraser'
    | 'text_banner'
    | 'watermark';

// --- AI Design Generations (from /designs/my-generations) ---
export interface AiGeneration {
    id: string;
    project_id?: string | null;
    result_url: string;
    visual_prompt: string | null;
    raw_text: string | null;
    created_at: string;
}

// --- Design Generation Request Types ---
export interface GenerateDesignRequest {
    raw_text: string;
    aspect_ratio?: string;
    reference_image_url?: string;
    remove_product_bg?: boolean;
    product_image_url?: string;
    brand_kit_id?: string;
    template_id?: string;
}

export interface RedesignFromReferenceRequest {
    reference_image_url: string;
    raw_text: string;
    strength?: number;
    aspect_ratio?: string;
    brand_kit_id?: string;
}
