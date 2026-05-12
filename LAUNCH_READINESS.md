# Launch Readiness

Last audited: 2026-05-12

This file is the paid-beta operating snapshot for SmartDesign Studio. It focuses on whether the product can run a controlled 30-50 seller beta with enough measurement, billing discipline, admin visibility, security, and documentation hygiene.

## Executive Summary

Status: **P0 launch-readiness baseline is now implemented for a controlled paid beta, with P1 workflow polish and legal/PDP packaging still required before a wider launch.**

The repo now has the operating baseline needed for a small 30-50 seller beta: typed funnel analytics, an AI usage/cost ledger, operator dashboard visibility, export feedback capture, upload audit coverage, production secret guardrails, and architecture docs that match the current Docker Compose runtime.

## Current State

| Area | Status | Evidence | Beta risk |
| --- | --- | --- | --- |
| Core seller workflow | Partial | Create/editor/tools routes exist under `frontend/src/app`, backend design/tool APIs exist under `backend/app/api` | Flow may be feature-rich but not yet measured as one seller funnel from upload to export |
| Analytics | Ready for beta | Canonical taxonomy in `docs/analytics-event-taxonomy.md`; typed frontend wrapper in `frontend/src/lib/analytics/events.ts`; acquisition, activation, export, payment, and feedback events wired | Backend-owned retention cohorts still need weekly analysis/querying |
| Credits/billing | Ready for beta | `credit_transactions` plus `ai_usage_events` link user, job/tool job, provider/model, cost fields, credit charge, status, error, and refund transaction | Actual provider costs still depend on providers returning reliable cost metadata |
| AI jobs | Ready for beta | Async job status plus `ai_usage_events`; refund lifecycle is mirrored into the ledger and async refunds check the ledger before issuing another refund | Legacy `_charged_credits` and `_refunded` payload markers remain for backward compatibility |
| Payments | Ready for beta | Storage payments and paid/refund summary are visible in `/api/internal/operator-summary` and `/operator` | Credit top-up products beyond storage are still future work |
| Admin/operator dashboard | Ready for beta | Token-protected `/api/internal/operator-summary` and `/operator` show users, jobs, AI usage/cost, credits, payments, failures/refunds, and export feedback | Fine-grained admin actions are intentionally not included yet |
| Upload/security | Ready for beta | `docs/upload-security-audit.md` covers every `UploadFile` endpoint; PDF brand-guidelines upload now has size/magic-byte checks and action rate limiting | Malware scanning, signed private URLs, and retention automation remain post-beta hardening |
| Legal/PDP baseline | Ready for beta | Product-facing `/terms`, `/privacy`, and `/privacy#penghapusan-data` now disclose paid-beta terms, third-party AI providers, and account/data deletion handling | Formal legal review is still recommended before scaling beyond controlled beta |
| Documentation | Ready for beta | `README.md`, `LAUNCH_READINESS.md`, and `docs/architecture/*` now describe the current backend in-process layout runtime and operator baseline | Long-form feature docs may still include historical planning notes |

## Production-Ready Enough

- Core Docker Compose runtime for Postgres, Redis, backend, Celery, and frontend.
- Authenticated user profile, project/folder/history, brand kit, AI tools, and create/editor surfaces.
- Centralized credit constants and credit transaction history.
- Async AI tool job model with status/progress/error fields and refund helper patterns.
- Upload validation helper with MIME magic-byte checks, max size, Pillow verify, and storage quota integration.
- Rate limiting helpers for authenticated heavy actions and public endpoints.
- PostHog wiring for frontend pageviews and some launch/landing events.
- Internal LLM metrics endpoint protected by `INTERNAL_METRICS_TOKEN`.
- `ai_usage_events` audit ledger for AI usage, provider/model, cost, status, and refund correlation.
- Minimal operator dashboard and export feedback capture for paid-beta weekly review.
- Production/staging startup guardrails for required AI, payment, storage, and internal-token settings.

## Still Mock, Partial, Or Risky

- Production/staging now fails loudly if required secrets are missing, but each deployment environment still needs real secret provisioning and smoke testing.
- Credit transactions remain the balance ledger; rich provider/cost metadata lives in `ai_usage_events`.
- Some historical feature docs are still planning docs and should not be treated as runtime source of truth.
- Legal/PDP pages are now visible, but formal legal review is still recommended before scaling beyond controlled beta.
- Marketplace/template docs exist, but marketplace should remain deferred until repeat use and paid willingness are proven.

## P0 Launch-Readiness Checklist

- [x] Define one canonical event map in docs and code for:
  - `landing_viewed`
  - `waitlist_submitted`
  - `signup_started`
  - `signup_completed`
  - `first_design_created`
  - `first_image_uploaded`
  - `prompt_submitted`
  - `generation_succeeded`
  - `generation_failed`
  - `first_export`
  - `payment_started`
  - `payment_succeeded`
  - `payment_failed`
  - `credits_consumed`
  - `feedback_submitted`
- [x] Add shared analytics wrapper so event names/properties are typed and not scattered.
- [x] Extend credit/job ledger schema or add a dedicated `ai_usage_events` table with:
  - `user_id`
  - `job_id`
  - `operation`
  - `provider`
  - `model`
  - `quality`
  - `estimated_cost`
  - `actual_cost`
  - `credits_charged`
  - `status`
  - `error_code`
  - `refund_transaction_id`
- [x] Make credit refund behavior idempotent and queryable without reading ad hoc payload flags. **Completed 2026-05-12:** refund lifecycle is mirrored into `ai_usage_events`; async job refunds check ledger status/refund transaction before issuing another refund. **Hardened 2026-05-12:** added DB-level partial UNIQUE index on `ai_usage_events.refund_transaction_id WHERE NOT NULL` (migration `d1e2f3a4b5c6`) so concurrent double-refund is blocked at the DB constraint layer, not only application layer. Worker catches `IntegrityError` and logs a warning without re-raising. Legacy `_refunded` flags remain only as backward-compatible markers.
- [x] Build minimal operator dashboard with users, AI jobs, credit transactions, payments, cost summary, and feedback. **Completed 2026-05-12:** added token-protected `/api/internal/operator-summary` and `/operator` dashboard for users, job status, AI usage/cost, credits, storage payments, recent failures/refunds, and export feedback.
- [x] Add export feedback capture: "hasil ini membantu?" with `design_id`, `job_id`, `user_id`, rating, and free-text note. **Completed 2026-05-12:** added `design_feedback` table, `/api/designs/export-feedback`, editor post-export feedback UI, operator feedback summary, and editor wiring for the last applied `job_id`.
- [x] Review every `UploadFile` endpoint for `validate_uploaded_image`, max size, quota, and rate limit consistency. **Completed 2026-05-12:** see `docs/upload-security-audit.md`; hardened brand-guidelines PDF upload with 10MB and magic-byte validation plus action rate limiting.
- [x] Add production guardrails to fail loudly when required AI/payment/storage env vars are missing. **Completed 2026-05-12:** backend startup validates required settings when `ENVIRONMENT=staging`, `ENVIRONMENT=production`, or `REQUIRE_PRODUCTION_SECRETS=true`.
- [x] Finish docs cleanup for legacy `quantum-engine` references in `docs/architecture/*`. **Completed 2026-05-12:** architecture docs now describe backend in-process layout optimization and the current Compose service topology.

## P1 Paid-Beta Workflow Checklist

- [ ] Polish the seller workflow as the primary path:
  - Upload product photo
  - Choose Shopee/Tokopedia/Instagram/WhatsApp target
  - Answer short Indonesian brief
  - Generate visual and copy
  - Light edit
  - Export multi-format
- [ ] Add marketplace/social presets as first-class choices in the create flow.
- [ ] Prepare 20-50 internal templates for F&B, fashion, beauty, hampers, and discount campaigns.
- [ ] Add invite-only beta access using allowlisted emails or referral codes.
- [ ] Give beta users initial free credits and expose remaining credits clearly.
- [x] Add weekly beta review dashboard/query. **Completed 2026-05-12:** internal `/api/internal/operator-summary` now includes `weekly_beta_review` funnel/cost block; operational query pack documented in `docs/weekly-beta-review-dashboard.md`.
  - visitor to signup
  - signup to first design
  - first design to export
  - export to payment
  - payment to repeat use
  - AI cost per paying user

## Defer Explicitly

- Template marketplace/community supply.
- Enterprise and white-label features.
- Public API.
- Kubernetes/autoscaling work beyond current Docker Compose deployment.
- Adding more AI models before cost attribution is first-class.
- Large public launch before paid-beta funnel and billing are observable.

## Suggested 2-Week Sprint

1. Day 1-2: Finalize analytics taxonomy and add typed tracking wrapper. **Started 2026-05-12:** added `docs/analytics-event-taxonomy.md`, typed wrapper, and core funnel wiring for signup, create upload, prompt submit, generation success/fail, first export, and storage payment events.
2. Day 3-5: Add AI usage/cost ledger fields or table; wire generation success/fail/refund events. **Started 2026-05-12:** added `ai_usage_events` model/migration/service, linked credit transactions, and wired create generation, redesign, async AI tool job charge/status/refund paths.
3. Day 6-7: Build minimal admin/operator dashboard and internal API. **Started 2026-05-12:** added internal operator summary API plus frontend `/operator` dashboard protected by `X-Internal-Token`.
4. Day 8-9: Harden upload endpoints and production env validation.
5. Day 10: Clean remaining docs drift and write beta runbook with rollback steps. **Docs drift completed 2026-05-12; beta runbook/rollback wording remains a P1 operations doc.**

## Beta Acceptance Criteria

- Operator can answer, within 5 minutes, how many users signed up, created, exported, paid, repeated, failed generation, and consumed credits this week.
- Every paid/credit-changing AI operation can be reconciled from user action to provider/model to credit transaction to refund if any.
- A failed AI generation never silently consumes credits.
- A seller can complete upload -> generate -> edit -> export without needing help.
- Privacy/TOS/data deletion/third-party AI provider disclosure are visible before paid beta.
- Marketplace work remains blocked until repeat usage and paid conversion are measured.
