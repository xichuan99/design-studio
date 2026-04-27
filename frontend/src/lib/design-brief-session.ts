export const DESIGN_BRIEF_SESSION_KEY = "smartdesign_design_brief_v1";

export interface DesignBriefSessionState {
    goal: string;
    productType: string;
    customProductType?: string;
    style: string;
    channel: string;
    copyTone: string;
    notes?: string;
    productImageUrl?: string;
    updatedAt: string;
}