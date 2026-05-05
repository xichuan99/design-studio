import type { PostHog } from "posthog-js";

export function trackLandingViewed(posthog: PostHog | null | undefined, variant: string): void {
  posthog?.capture("landing_viewed", { variant });
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
  posthog?.capture("waitlist_submitted", payload);
}

export function trackLandingCtaClicked(
  posthog: PostHog | null | undefined,
  payload: {
    variant: string;
    cta_name: string;
    cta_location: string;
  },
): void {
  posthog?.capture("landing_cta_clicked", payload);
}