import { API_BASE_URL } from "@/lib/api/coreApi";

const VISITOR_ID_STORAGE_KEY = "smartdesign.analytics.visitor_id";
const SIGNUP_COMPLETED_STORAGE_KEY = "smartdesign.analytics.signup_completed_logged";

type BackendAnalyticsEventName = "landing_viewed" | "signup_completed";

function getOrCreateVisitorId(posthogDistinctId?: string | null): string {
  if (typeof window === "undefined") {
    return posthogDistinctId || "server";
  }

  const existing = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const visitorId = posthogDistinctId || (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);

  window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
  return visitorId;
}

export function getAnalyticsVisitorId(posthogDistinctId?: string | null): string {
  return getOrCreateVisitorId(posthogDistinctId);
}

export function hasLoggedBackendSignupCompleted(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(SIGNUP_COMPLETED_STORAGE_KEY) === "1";
}

export function markBackendSignupCompletedLogged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SIGNUP_COMPLETED_STORAGE_KEY, "1");
}

export async function trackBackendFunnelEvent(
  posthogDistinctId: string | null | undefined,
  eventName: BackendAnalyticsEventName,
  payload: {
    variant?: string;
    auth_method?: string;
    source?: string;
    properties?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const visitorId = getOrCreateVisitorId(posthogDistinctId);
    await fetch(`${API_BASE_URL}/analytics/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        visitor_id: visitorId,
        event_name: eventName,
        variant: payload.variant,
        auth_method: payload.auth_method,
        source: payload.source,
        properties: payload.properties || {},
      }),
    });
  } catch {
    // Backend analytics is best-effort; never block the UI.
  }
}
