export interface ProjectPayload {
    id?: string;
    title: string;
    canvas_state: object;
    status: string;
    aspect_ratio?: string;
}

// --- History Types ---
export interface HistoryEntry {
    id: string;
    project_id: string;
    action_type: string;
    canvas_state?: Record<string, unknown>;
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
}

export interface Typography {
    primaryFont?: string;
    secondaryFont?: string;
}

export interface BrandKit {
    id: string;
    user_id: string;
    name: string;
    logo_url: string | null;
    logos: string[];
    colors: ColorSwatch[];
    typography?: Typography;
    is_active: boolean;
    created_at: string;
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

// --- AI Design Generations (from /designs/my-generations) ---
export interface AiGeneration {
    id: string;
    result_url: string;
    visual_prompt: string | null;
    raw_text: string | null;
    created_at: string;
}
