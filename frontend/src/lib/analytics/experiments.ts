import type { PostHog } from "posthog-js";
import { trackEvent } from "@/lib/analytics/events";

export function trackLandingViewed(posthog: PostHog | null | undefined, variant: string): void {
  trackEvent(posthog, "landing_viewed", { variant });
}

export function trackWaitlistSubmitted(
  posthog: PostHog | null | undefined,
  payload: {
    variant: string;
    source: string;
    is_new: boolean;
    position: number | null;
  },
): void {
  trackEvent(posthog, "waitlist_submitted", payload);
}

export function trackLandingCtaClicked(
  posthog: PostHog | null | undefined,
  payload: {
    variant: string;
    cta_name: string;
    cta_location: string;
  },
): void {
  trackEvent(posthog, "landing_cta_clicked", payload);
}
