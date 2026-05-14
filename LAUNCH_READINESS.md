# Launch Readiness

Last audited: 2026-05-14

This file is the paid-beta operating snapshot for SmartDesign Studio. It focuses on whether the product can run a controlled 30-50 seller beta with enough measurement, billing discipline, admin visibility, security, and documentation hygiene.

## Executive Summary

Status: **Phase 1, Phase 2, and Phase 3 complete. Phase 4 seller-first activation is now implemented in the working tree and verified for onboarding hydration, template platform filtering, lint/build, and backend tests. One final runtime seed/API sanity check is still recommended before calling Phase 4 fully closed.**

Monetization core (credit packs with Midtrans, idempotent webhook fulfillment, operator revenue reporting), beta control plane (allowlist gating, invite-source tracking, support runbook), and funnel truth measurement (backend export event, backend-owned visitor-to-signup, cohort retention, repeat purchases) are implemented and tested. All 23 tests passing. 

Next: complete the final runtime seed/API sanity check, then close Phase 4 and move remaining work to Phase 5 hardening.

## Current State

| Area | Status | Evidence | Beta risk |
| --- | --- | --- | --- |
| Core seller workflow | Partial | Create/editor/tools routes exist under `frontend/src/app`, backend design/tool APIs exist under `backend/app/api` | Flow may be feature-rich but not yet measured as one seller funnel from upload to export |
| Analytics | Ready for beta | Canonical taxonomy in `docs/analytics-event-taxonomy.md`; typed frontend wrapper in `frontend/src/lib/analytics/events.ts`; acquisition, activation, export, payment, and feedback events wired | Landing + signup now also land in backend `analytics_events`, but broader product analytics still remain partially PostHog-backed |
| Credits/billing | Ready for beta | `credit_transactions` plus `ai_usage_events` link user, job/tool job, provider/model, cost fields, credit charge, status, error, and refund transaction | Actual provider costs still depend on providers returning reliable cost metadata |
| AI jobs | Ready for beta | Async job status plus `ai_usage_events`; refund lifecycle is mirrored into the ledger and async refunds check the ledger before issuing another refund | Legacy `_charged_credits` and `_refunded` payload markers remain for backward compatibility |
| Payments | Ready for beta | Storage payments and credit-pack revenue/fulfillment are visible in `/api/internal/operator-summary` and `/operator` | Shared operator auth and broader payment ops hardening remain for post-beta |
| Admin/operator dashboard | Ready for founder-led beta | Token-protected `/api/internal/operator-summary` and `/operator` show users, jobs, AI usage/cost, credits, payments, failures/refunds, and export feedback | Shared internal token stored by the browser should be replaced with role-based/session auth before a larger team uses it |
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
- Credit-pack pricing is visible on the landing page, but backend payment fulfillment and operator revenue reporting are still storage-centric.
- Invite-only beta gating is not yet the main control plane for onboarding the first 30-50 sellers.

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

- [ ] Make credit top-up checkout first-class:
  - Define credit pack catalog that matches landing pricing.
  - Create Midtrans checkout intent for credit packs, separate from storage add-ons.
  - Fulfill paid notifications into `credit_transactions` exactly once.
  - Show credit revenue, successful purchases, failed purchases, and repeat purchases in `/operator`.
  - Add reconciliation tests for paid, pending, failed, expired, and duplicate webhook events.
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
- [ ] Add an authoritative export event that does not depend on feedback submission.
- [x] Pull or mirror `visitor_to_signup` from backend analytics into the weekly operator review.
- [ ] Replace shared operator token storage with session/role-based admin access before adding non-founder operators.
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

## Execution Plan From 2026-05-13

This plan assumes the next goal is a **controlled paid beta with 30-50 invited Indonesian sellers**, not a public launch. Work should bias toward proving paid activation, repeat usage, credit margin, and support load before expanding traffic.

### Phase 1: Monetization Core (Week 1) ✅ COMPLETE

Goal: make the credit-pack promise on the landing page real end-to-end. **Status: DONE (2026-05-13)**

- [x] Add a credit-pack catalog that maps product IDs to credits, price, label, and bonus/daily-claim policy.
- [x] Add backend credit-purchase intent creation using Midtrans, separate from storage purchases.
- [x] Process Midtrans notifications into `credit_transactions` with idempotency protection.
- [x] Add reconciliation for pending credit purchases, matching the existing storage reconciliation pattern where practical.
- [x] Update `/api/internal/operator-summary` and `/operator` to show credit revenue, credit purchases by status, repeat purchase count, and revenue per paying user.
- [x] Update privacy/payment wording if credit purchases use different refund or fulfillment rules than storage add-ons.

Acceptance criteria:

- [x] A user can buy a credit pack and see the balance increase without manual admin work.
- [x] Duplicate webhook delivery does not grant duplicate credits.
- [x] Operator can distinguish storage revenue from credit-pack revenue.
- [x] Tests cover paid, pending, failed, expired, duplicate, and reconciliation paths. (15 tests, all passing)

**Completion Evidence:**
- Backend: `credit_purchases` table, `credit_payment_service.py`, Midtrans Snap integration, webhook processing with SHA512 signature verification
- Idempotency: `paid_event_id` unique constraint + `process_webhook_event()` SELECT FOR UPDATE row locking
- Reconciliation: `credit_reconcile.py` Celery beat task every 10 minutes
- Frontend: `CreditPackSection.tsx` in settings page with catalog, checkout, status polling, purchase history
- Operator metrics: 5 new fields in `/api/internal/operator-summary` for credit revenue, status breakdown, repeat purchasers
- Tests: 15 passing covering all Midtrans statuses (paid/pending/failed/expired/canceled/capture/settlement/fraud challenge)

### Phase 2: Beta Control Plane (Week 2) ✅ COMPLETE

Goal: keep the first beta small, measurable, and supportable. **Status: DONE (2026-05-13)**

- [x] Add allowlisted email or invite-code gating to signup/onboarding.
- [x] Decide whether beta users receive initial free credits, and implement the grant once per user.
- [x] Add an admin-visible source field for invite code, referral code, or allowlist cohort.
- [x] Create a short beta support runbook: refund, failed generation, payment pending, provider outage, deploy rollback.
- [x] Keep public acquisition pointed to waitlist until the invite gate is intentionally relaxed.

Acceptance criteria:

- [x] Non-invited users cannot enter the paid beta flow.
- [x] Invited users can onboard without founder intervention.
- [x] Operator can see which cohort/invite source a user came from.
- [x] Support has written steps for the top five likely beta incidents.

**Completion Evidence:**
- Backend: `BetaAllowlist` model with email/code entry_type, status, usage tracking; `beta_allowlist_service.py` with check/create/update/list functions
- Gating: `register()` endpoint validates allowlist when `BETA_GATING_ENABLED=true`; conditional credit grants via `allowlist.initial_credits_grant`
- Tracking: `user.invite_source` field records signup method (email_allowlist, code_allowlist, credentials); operator-summary shows `signups_by_invite_source_7d` breakdown
- Operator APIs: POST/GET/PATCH/GET stats endpoints under `/api/internal/beta-allowlist/*` (require internal token)
- Support: `/docs/beta-support-runbook.md` with 5 major incident types (signup failure, failed generation, stuck payment, export failure, provider outage)
- Migrations: `f2e8d7c6b5a4` creates beta_allowlist table + invite_source column
- Frontend: Register page now accepts optional `invite_code` parameter
- Tests: 5 tests passing in operator-summary covering new fields

### Phase 3: Funnel Truth (Week 2-3) ✅ COMPLETE

Goal: remove the two biggest measurement blind spots. **Status: DONE (2026-05-13)**

- [x] Add a backend-owned export event or signed export callback so `generation_to_export` is not inferred from feedback.
- [x] Pull `visitor_to_signup` into the weekly review from backend analytics events.
- [x] Add D1/D7 cohort queries based on signup date and later generation/export activity.
- [x] Track repeat purchase within 30 days after first payment.

Acceptance criteria:

- [x] Weekly review can answer: visitors, signups, first design, first generation, first export, first payment, repeat use, repeat purchase.
- [x] Export rate does not depend on users submitting feedback.
- [x] Retention and repeat purchase are visible by cohort.

**Completion Evidence So Far:**
- Backend-owned export tracking endpoint: `/api/designs/{design_id}/export-event`
- Weekly review now prefers backend export events over feedback proxy for `generation_to_export`
- Visitor-to-signup is now backed by backend `analytics_events` for `landing_viewed` and `signup_completed`
- Retention query now groups signup cohorts and measures D1/D7 activity from upload/generation/export signals
- Repeat purchase metric now counts users with 2+ paid credit purchases inside a 30-day window
- Validation: Phase 3 metrics helpers covered by `tests/test_phase3_metrics.py` and backend suite passing

### Phase 4: Seller-First Activation (Week 3-5)

Goal: make the first value moment obvious for the target seller.

- Make marketplace/social targets first-class choices: Shopee, Tokopedia, Instagram feed/story, WhatsApp catalog/status.
- Prepare 20-50 internal templates across F&B, fashion, beauty, hampers, discount campaigns, and new-arrival promos.
- Reduce blank-canvas decisions in onboarding by starting from category, channel, product photo, and promotion type.
- Keep marketplace/community template supply deferred until repeat usage is proven.

Completion evidence (2026-05-14):

- Seller-first entry route exists at `/design/new/seller` and is linked from `/start` behind `SELLER_FIRST_V1`.
- `SellerChannelWizard` pre-fills brief state with channel, promo type, style, notes, and aspect ratio mapped to seller intent.
- Interview page now hydrates seller-first prefill from `DESIGN_BRIEF_SESSION_KEY` once after auth is ready, preserving the guided onboarding path instead of dropping users back into a blank generic form.
- Template API supports `platform` filtering and returns `platform` in both list/detail payloads.
- Backend template API coverage now includes explicit tests for `?platform=shopee` filtering and template detail payload shape.
- Source template seed inventory remains above threshold with 44 entries total and platform-tagged sets for Shopee, Tokopedia, Instagram, Instagram Story, and WhatsApp.
- Verification passed: frontend lint, frontend build, backend tests, and Playwright hydration scenario for seller-first interview prefill.

Acceptance criteria:

- A seller can complete upload -> choose channel -> answer short brief -> generate -> light edit -> export without help.
- At least 20 templates are usable in production data, not only design mockups.
- The first design experience is optimized for Indonesian seller copy and channels.

Current closeout note:

- The onboarding optimization and template-platform plumbing are now implemented and verified in code/tests.
- Before declaring Phase 4 fully closed, perform one final runtime sanity check against a seeded local/runtime templates dataset so the "usable in production data" criterion is evidenced beyond source code + API tests.

### Phase 5: Operator And Security Hardening (Week 5-6)

Goal: make internal operations safe enough for more than one founder/operator.

- Replace browser-stored shared operator token with authenticated admin/session access.
- Add role checks for `/operator` and internal operator APIs.
- Review asset access policy for private/signed URLs and retention cleanup.
- Decide whether malware scanning is required before opening beyond controlled beta.
- Tombstone or archive remaining legacy `quantum-engine` repo artifacts so new contributors do not treat them as active runtime services.

Acceptance criteria:

- Operator access is tied to a real admin identity, not a pasted shared token.
- Internal dashboards are not exposed to normal users.
- Legacy runtime references clearly say inactive/deprecated.
- Asset privacy and retention risks have a documented owner and schedule.

## Beta Metrics Targets

These are decision thresholds for the controlled beta. They are not current measured values.

| Metric | Target | Decision use |
| --- | --- | --- |
| Signup -> first design | >= 45% | Onboarding clarity |
| First design -> generation | >= 70% | Value moment reached |
| Generation -> export | >= 50% | Output usefulness |
| Export feedback response rate | >= 30% of exporters | Quality signal strength |
| Activated beta users -> first payment | >= 10% | Paid willingness |
| Paying users -> repeat purchase in 30d | >= 15% | Repeatable demand |
| Gross margin on standard generation | >= 60% | Pricing safety |
| Silent credit loss | 0 incidents | Trust and billing safety |

## Go/No-Go Gates

- **Go for controlled paid beta:** credit checkout works end-to-end, invite gating is active, operator can reconcile credits/revenue/refunds, and failed generation refunds are observable.
- **Continue beta, do not launch publicly:** paid activation exists but repeat purchase, D7 retention, or generation->export are weak.
- **Go for wider launch:** repeat purchase is visible, standard generation margin is healthy, support load is manageable, operator auth is hardened, and legal/payment wording has had a final review.
- **No-go:** duplicate credit grants, silent credit loss, unmeasured export flow, or inability to reconcile AI provider cost against credits consumed.

## Beta Acceptance Criteria

- Operator can answer, within 5 minutes, how many users signed up, created, exported, paid, repeated, failed generation, and consumed credits this week.
- Every paid/credit-changing AI operation can be reconciled from user action to provider/model to credit transaction to refund if any.
- A failed AI generation never silently consumes credits.
- A seller can complete upload -> generate -> edit -> export without needing help.
- Privacy/TOS/data deletion/third-party AI provider disclosure are visible before paid beta.
- Marketplace work remains blocked until repeat usage and paid conversion are measured.
