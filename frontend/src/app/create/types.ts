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
    quantum_layout?: string;
    variation_results?: VariationResult[];
}

export interface VariationResult {
    set_num: number;
    result_url: string | null;
    composition: {
        set_num: number;
        ratio: string;
        copy_space_side: string;
        layout_name?: string;
        validation_flags?: string[];
    };
    image_prompt_modifier: string;
    layout_elements: {
        role: string;
        x: number;
        y: number;
        font_size?: number;
        font_weight?: string;
        text_align?: string;
        outline?: boolean;
    }[];
}

export interface BriefQuestion {
    id: string;
    question: string;
    type: 'choice' | 'text' | 'color_picker';
    options?: string[];
    default?: string;
}

export interface BriefQuestionsResponse {
    questions: BriefQuestion[];
}

export type UserIntent = 'ad_from_photo' | 'clean_photo' | 'content_from_text' | null;

export interface ManualCopyOverrides {
    headlineOverride: string;
    subHeadlineOverride: string;
    ctaOverride: string;
    productName: string;
    offerText: string;
    useAiCopyAssist: boolean;
}

export interface CopyLengthWarning {
    field: 'headline';
    message: string;
    currentLength: number;
    recommendedMax: number;
    context: string;
}

export const DEFAULT_MANUAL_COPY_OVERRIDES: ManualCopyOverrides = {
    headlineOverride: '',
    subHeadlineOverride: '',
    ctaOverride: '',
    productName: '',
    offerText: '',
    useAiCopyAssist: true,
};

export function normalizeOptionalCopyValue(value: string | undefined | null): string | undefined {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
}

export function buildHeadlineLengthWarning(
    headline: string,
    aspectRatio: string,
    integratedText = false
): CopyLengthWarning | null {
    const normalized = headline.trim();
    if (!normalized) {
        return null;
    }

    const currentLength = normalized.length;

    const profile = integratedText
        ? {
            recommendedMax: aspectRatio === '9:16' ? 18 : aspectRatio === '16:9' ? 24 : 22,
            context: aspectRatio === '9:16'
                ? 'layout vertikal dengan teks menyatu'
                : aspectRatio === '16:9'
                    ? 'layout lebar dengan teks menyatu'
                    : 'layout compact dengan teks menyatu',
        }
        : {
            recommendedMax: aspectRatio === '9:16' ? 28 : aspectRatio === '16:9' ? 42 : 34,
            context: aspectRatio === '9:16'
                ? 'layout vertikal / compact'
                : aspectRatio === '16:9'
                    ? 'layout horizontal yang lebih lega'
                    : 'layout square / compact',
        };

    if (currentLength <= profile.recommendedMax) {
        return null;
    }

    return {
        field: 'headline',
        currentLength,
        recommendedMax: profile.recommendedMax,
        context: profile.context,
        message: `Headline ${currentLength} karakter cukup panjang untuk ${profile.context}. Coba ringkas ke sekitar ${profile.recommendedMax} karakter agar layout lebih aman.`,
    };
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
