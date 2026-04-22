export interface CanvasElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fill?: string;
    align?: string;
    [key: string]: unknown;
}

export interface ProjectCanvasState {
    elements?: CanvasElement[];
    backgroundUrl?: string;
    [key: string]: unknown;
}

export interface ProjectPayload {
    id?: string;
    title: string;
    canvas_state: ProjectCanvasState | Record<string, unknown>;
    canvas_schema_version?: number;
    status: string;
    aspect_ratio?: string;
    folder_id?: string | null;
}

// --- Project Version Types ---
export interface ProjectVersionCreate {
    version_name?: string;
    canvas_state?: ProjectCanvasState | Record<string, unknown>;
    canvas_schema_version?: number;
}

export interface ProjectVersionResponse {
    id: string;
    project_id: string;
    user_id: string;
    version_name: string;
    canvas_state?: ProjectCanvasState | Record<string, unknown>;
    canvas_schema_version: number;
    created_at: string;
}


// --- History Types ---
export interface HistoryCreateRequest {
    project_id: string;
    background_url: string;
    text_layers: unknown[];
    generation_params?: Record<string, unknown>;
    canvas_schema_version?: number;
}

export interface HistoryEntry {
    id: string;
    project_id: string;
    action_type: string;
    canvas_state?: ProjectCanvasState | Record<string, unknown>;
    canvas_schema_version?: number;
    prompt_used?: string;
    created_at: string;
}

// --- Folder Types ---
export interface Folder {
    id: string;
    name: string;
    parent_id: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
    children?: Folder[]; // Used for tree structures if populated
}

export interface FolderCreate {
    name: string;
    parent_id?: string | null;
}

export interface FolderUpdate {
    name?: string;
    parent_id?: string | null;
}

// --- Brand Kit Types ---
export type ColorRole = 'primary' | 'secondary' | 'accent' | 'background' | 'text';

export interface Template {
    id: string;
    name: string;
    description: string;
    category: string;
    aspect_ratio: string;
    layout_data: ProjectCanvasState | Record<string, unknown>;
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
    folder_id?: string | null;
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

// --- User Types ---
export interface UserUpdate {
    name?: string;
}

export interface UserResponse {
    id: string;
    email: string;
    name: string;
    avatar_url?: string | null;
    credits_remaining: number;
    storage_used: number;
    storage_quota: number;
    provider: string;
    created_at: string;
}

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
export interface CopywritingClarifyRequest {
    product_description: string;
}

export interface ClarifyUnifiedRequest {
    raw_text: string;
    mode?: string;
}

export interface CopywritingRequest {
    product_description: string;
    tone?: string;
    brand_name?: string;
    clarification_answers?: Record<string, string>;
}

export interface CopywritingVariation {
    style: string;
    headline: string;
    subline: string;
    cta: string;
    full_text: string;
}

export interface CopywritingResponse {
    variations: CopywritingVariation[];
}

// --- Text Parser Types ---
export interface VisualPromptPart {
    category: string;
    label: string;
    value: string;
    enabled: boolean;
}

export interface AITextLayout {
    x: number;
    y: number;
    font_family: string;
    font_size: number;
    font_weight: number;
    color: string;
    align: string;
}

export interface ParsedTextElements {
    headline: string;
    sub_headline?: string;
    cta?: string;
    visual_prompt: string;
    indonesian_translation: string;
    visual_prompt_parts: VisualPromptPart[];
    suggested_colors: string[];
    headline_layout?: AITextLayout;
    sub_headline_layout?: AITextLayout;
    cta_layout?: AITextLayout;
}

// --- Carousel Types ---
export interface CarouselBrandTokens {
    primary: string;
    light: string;
    dark: string;
    light_bg: string;
    dark_bg: string;
    border: string;
    heading_font: string;
    body_font: string;
}

export interface CarouselSlide {
    index: number;
    type: string;
    headline: string;
    body: string;
    cta?: string | null;
}

export interface CarouselGenerateRequest {
    topic: string;
    brand_name: string;
    ig_handle?: string;
    primary_color: string;
    font_style: string;
    tone: string;
    num_slides: number;
}

export interface CarouselGenerateResponse {
    carousel_id: string;
    brand_tokens: CarouselBrandTokens;
    slides: CarouselSlide[];
}

export interface CarouselRegenerateSlideRequest extends CarouselGenerateRequest {
    carousel_id: string;
    slide_index: number;
    instruction?: string;
    slides: CarouselSlide[];
}

export interface CarouselExportRequest {
    carousel_id: string;
    brand_name: string;
    ig_handle?: string;
    brand_tokens: CarouselBrandTokens;
    slides: CarouselSlide[];
}

export interface ParseDesignTextRequest {
    raw_text: string;
    aspect_ratio?: string;
    style_preference?: string;
    num_variations?: number;
    integrated_text?: boolean;
    clarification_answers?: Record<string, string>;
}

// --- Magic Text Types ---
export interface MagicTextRequest {
    image_base64: string;
    text: string;
    canvas_width?: number;
    canvas_height?: number;
    style_hint?: string;
}

export interface MagicTextElement {
    text: string;
    font_family: string;
    font_size: number;
    font_weight: number;
    color: string;
    align: string;
    x: number;
    y: number;
    letter_spacing: number;
    line_height: number;
    text_transform: string;
    text_shadow?: string;
    opacity: number;
    rotation: number;
    background_color?: string;
    background_padding: number;
    background_radius: number;
}

export interface MagicTextResponse {
    elements: MagicTextElement[];
}

// --- Generation Jobs Types ---
export interface GenerateDesignRequest {
    raw_text: string;
    mode?: string;
    reference_image_url?: string;
    template_id?: string;
    aspect_ratio: string;
    style_preference?: string;
    color_palette_override?: string[];
    num_variations?: number;
    integrated_text?: boolean;
    clarification_answers?: Record<string, string>;
    brand_kit_id?: string;
    product_image_url?: string;
    remove_product_bg?: boolean;
    seed?: string;
}

export interface RedesignRequest {
    reference_image_url: string;
    raw_text?: string;
    strength?: number;
    aspect_ratio: string;
    style_preference?: string;
    brand_kit_id?: string;
    preserve_product?: boolean;
}

export interface UploadImageResponse {
    url: string;
}

// --- AI Tool Jobs Types ---
export type AiToolJobStatus =
    | 'queued'
    | 'uploading'
    | 'processing'
    | 'saving'
    | 'completed'
    | 'failed'
    | 'canceled'
    | 'cancel_requested';

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

export interface CreateToolJobRequest {
    tool_name: AiToolJobName;
    payload?: Record<string, unknown>;
    idempotency_key?: string;
}

// --- Generation Output Types ---
export interface TextLayer {
    id: string;
    role: string;
    text: string;
    font_family: string;
    font_weight: number;
    font_size: number;
    color: string;
    text_align: string;
    x: number;
    y: number;
    rotation: number;
    opacity: number;
    shadow?: string;
    background_box?: string;
}

export interface DesignVariation {
    background_image_url: string;
    text_layers: TextLayer[];
}

export interface DesignGenerationResponse {
    job_id: string;
    project_id: string;
    status: string;
    variations: DesignVariation[];
    credits_used: number;
    credits_remaining: number;
    generation_time_ms?: number;
}

export interface AiGeneration {
    id: string;
    project_id?: string | null;
    result_url: string;
    visual_prompt: string | null;
    raw_text: string | null;
    seed?: string | null;
    created_at: string;
}

export interface AiToolResult {
    id: string;
    tool_name: string;
    result_url: string;
    input_summary: string | null;
    file_size: number;
    created_at: string;
}

// --- Ad Creator Types ---
export interface AdCreatorRequest {
    image_base64: string;
    brief?: string;
    brand_kit_id?: string;
}

export interface BatchResizeRequest {
    image_url: string;
    target_sizes: string[];
}

export interface AdConcept {
    id: string;
    concept_name: string;
    image_url: string;
    headline: string;
    tagline: string;
    call_to_action: string;
}

export interface AdCreatorResponse {
    foreground_url: string;
    concepts: AdConcept[];
}
