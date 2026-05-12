# Analytics Event Taxonomy

Last updated: 2026-05-12

Canonical frontend events are typed in `frontend/src/lib/analytics/events.ts`. Use `trackEvent(posthog, eventName, payload)` for new funnel events so names and core properties stay consistent.

## Launch Funnel

| Funnel stage | Event | Required properties |
| --- | --- | --- |
| Acquisition | `landing_viewed` | `variant` |
| Acquisition | `waitlist_submitted` | `variant`, `source`, `is_new`, `position` |
| Acquisition | `signup_started` | `auth_method` |
| Acquisition | `signup_completed` | `auth_method` |
| Activation | `first_image_uploaded` | `source`, `file_type`, `file_size_mb` |
| Activation | `prompt_submitted` | `source` |
| Activation | `first_design_created` | `source` |
| AI usage | `generation_succeeded` | `source` |
| AI usage | `generation_failed` | `source` |
| Monetization | `payment_started` | `source`, `product_code`, `amount`, `currency` |
| Monetization | `payment_succeeded` | `source`, `product_code`, `amount`, `currency`, `status` |
| Monetization | `payment_failed` | `source`, `status` |
| Monetization | `credits_consumed` | `source`, `operation`, `credits_charged` |
| Retention/value | `first_export` | `source`, `format`, `canvas_width`, `canvas_height` |
| Feedback | `feedback_submitted` | `source` |

## Notes

- Keep existing feature-specific events when useful for local diagnostics, but add the canonical funnel event when the action maps to acquisition, activation, monetization, retention, or feedback.
- `first_*` events should be emitted once per browser profile using local storage until backend lifecycle analytics are available.
- `credits_consumed` can remain as a lightweight client funnel event, but authoritative provider/model/cost attribution now lives in backend `ai_usage_events`.
