import type { PostHog } from "posthog-js";

type AuthMethod = "credentials" | "google";
type GenerationStatus = "success" | "failed";
type PaymentStatus = "started" | "succeeded" | "failed" | "expired" | "canceled";

export interface AnalyticsEventPayloads {
  landing_viewed: {
    variant: string;
  };
  landing_cta_clicked: {
    variant: string;
    cta_name: string;
    cta_location: string;
  };
  waitlist_submitted: {
    variant: string;
    source: string;
    is_new: boolean;
    position: number | null;
  };
  signup_started: {
    auth_method: AuthMethod;
    source?: string;
  };
  signup_completed: {
    auth_method: AuthMethod;
    source?: string;
  };
  first_image_uploaded: {
    source: "create_flow" | "editor" | "tool";
    file_type: string;
    file_size_mb: number;
  };
  prompt_submitted: {
    source: "create_flow" | "design_brief";
    create_mode?: string;
    has_brand_kit?: boolean;
    has_reference_image?: boolean;
  };
  first_design_created: {
    source: "create_flow" | "design_brief" | "tool";
    create_mode?: string;
    aspect_ratio?: string;
    quality?: string;
  };
  generation_succeeded: {
    source: "create_flow" | "design_brief" | "tool";
    create_mode?: string;
    aspect_ratio?: string;
    quality?: string;
    result_count?: number;
    status?: GenerationStatus;
  };
  generation_failed: {
    source: "create_flow" | "design_brief" | "tool";
    create_mode?: string;
    aspect_ratio?: string;
    quality?: string;
    error_message?: string;
    status?: GenerationStatus;
  };
  first_export: {
    source: "editor";
    format: "png" | "jpeg" | "pdf";
    canvas_width: number;
    canvas_height: number;
  };
  payment_started: {
    source: "storage_settings" | "credits_settings";
    product_code: string;
    amount: number;
    currency: string;
  };
  payment_succeeded: {
    source: "storage_settings" | "credits_settings";
    product_code: string;
    amount: number;
    currency: string;
    purchase_id?: string;
    status: PaymentStatus;
  };
  payment_failed: {
    source: "storage_settings" | "credits_settings";
    product_code?: string;
    amount?: number;
    currency?: string;
    purchase_id?: string;
    status: PaymentStatus;
    error_message?: string;
  };
  credits_consumed: {
    source: "create_flow" | "design_brief" | "tool";
    operation: string;
    credits_charged: number;
    model?: string;
    provider?: string;
  };
  feedback_submitted: {
    source: "export" | "generation_result" | "support";
    rating?: number;
    design_id?: string;
    job_id?: string;
    helpful?: boolean;
  };
}

export type AnalyticsEventName = keyof AnalyticsEventPayloads;

export function trackEvent<TEventName extends AnalyticsEventName>(
  posthog: PostHog | null | undefined,
  eventName: TEventName,
  payload: AnalyticsEventPayloads[TEventName],
): void {
  posthog?.capture(eventName, payload);
}
