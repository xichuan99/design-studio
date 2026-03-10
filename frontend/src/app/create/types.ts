export interface VisualPromptPart {
    category: string;
    label: string;
    value: string;
    enabled: boolean;
}

export interface ParsedDesignData {
    headline?: string;
    sub_headline?: string;
    cta?: string;
    visual_prompt?: string;
    indonesian_translation?: string;
    visual_prompt_parts?: VisualPromptPart[];
    suggested_colors?: string[];
    generated_image_url?: string;
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
