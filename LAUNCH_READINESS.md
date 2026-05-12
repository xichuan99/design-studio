# Launch Readiness

Last audited: 2026-05-12

This file is the paid-beta operating snapshot for SmartDesign Studio. It focuses on whether the product can run a controlled 30-50 seller beta with enough measurement, billing discipline, admin visibility, security, and documentation hygiene.

## Executive Summary

Status: **Not ready for paid beta yet, but close enough for a focused 1-2 week launch-readiness sprint.**

The repo already has a strong product base: authenticated create/edit flows, AI tool jobs, PostHog frontend setup, credit transactions, storage purchase records, upload validation, rate limiting, and many UAT/feature docs. The main blocker is not feature depth. The blocker is operational completeness: funnel events are incomplete, AI cost/revenue attribution is not audit-grade, admin/operator visibility is thin, upload hardening is inconsistent across endpoints, and docs still drift around legacy quantum-engine architecture.

## Current State

| Area | Status | Evidence | Beta risk |
| --- | --- | --- | --- |
| Core seller workflow | Partial | Create/editor/tools routes exist under `frontend/src/app`, backend design/tool APIs exist under `backend/app/api` | Flow may be feature-rich but not yet measured as one seller funnel from upload to export |
| Analytics | Partial | PostHog provider in `frontend/src/app/providers.tsx`; landing/waitlist helpers in `frontend/src/lib/analytics/experiments.ts`; selected tool events in app pages | Missing canonical activation, export, payment, retention, and cost events |
| Credits/billing | Partial | `backend/app/models/credit_transaction.py`, `backend/app/services/credit_service.py`, `backend/app/core/credit_costs.py`, storage payment tables/API | Credit ledger lacks provider/model/cost/success/refund metadata needed for margin audit |
| AI jobs | Partial | `backend/app/models/ai_tool_job.py` tracks status/progress/result/error/latency and `_charged_credits` is stored in payload | Cost and provider routing are spread across payload/logs, not first-class analytics fields |
| Payments | Partial | `backend/app/models/storage_purchase.py`, `backend/app/api/storage_payments.py` | Storage purchase/payment exists, but credit purchase/payment economics are not yet visible as one operator view |
| Admin/operator dashboard | Gap | Only `/api/internal/llm-metrics` token endpoint found; no frontend admin route found | Operator cannot quickly see users, credits, jobs, payments, errors, feedback, and margin |
| Upload/security | Partial | `backend/app/services/file_validation.py` checks magic bytes, size, Pillow verify, and quota; rate limiter exists in `backend/app/api/rate_limit.py` | Some upload endpoints still need consistent validation/rate-limit review; no malware scan, signed private assets, or retention policy implementation found |
| Legal/PDP baseline | Gap | Data model supports account deletion; docs mention security, but no clear product-facing privacy/TOS/data deletion policy found | Paid beta can look untrustworthy if user-uploaded assets and third-party AI provider use are not disclosed |
| Documentation | Partial | README updated in this audit; many architecture docs still mention legacy quantum-engine | New contributor/operator can misunderstand runtime topology and production readiness |

## Production-Ready Enough

- Core Docker Compose runtime for Postgres, Redis, backend, Celery, and frontend.
- Authenticated user profile, project/folder/history, brand kit, AI tools, and create/editor surfaces.
- Centralized credit constants and credit transaction history.
- Async AI tool job model with status/progress/error fields and refund helper patterns.
- Upload validation helper with MIME magic-byte checks, max size, Pillow verify, and storage quota integration.
- Rate limiting helpers for authenticated heavy actions and public endpoints.
- PostHog wiring for frontend pageviews and some launch/landing events.
- Internal LLM metrics endpoint protected by `INTERNAL_METRICS_TOKEN`.

## Still Mock, Partial, Or Risky

- `backend/README.md` says AI endpoints can return mock data when `GEMINI_API_KEY` is missing. This is fine locally, but production/staging docs must make mock behavior impossible or obvious.
- Credit transactions only store `amount`, `balance_after`, and `description`; they do not store `operation`, `job_id`, `provider`, `model`, `estimated_cost`, `actual_cost`, `credit_charged`, `status`, or `refund_of`.
- AI job charged credits are stored inside `payload_json` as `_charged_credits`, which is useful but not enough for weekly cost/margin reporting.
- There is no visible admin dashboard page under `frontend/src/app` and no broad admin API for user/job/payment/feedback operations.
- Analytics coverage is fragmented. Landing and a few tool events exist, but the weekly funnel `visitor -> signup -> first design -> export -> pay -> repeat use` is not guaranteed.
- Several docs in `docs/architecture/*` still describe `quantum-engine` as a live container/service even though `docker-compose.yml` says it was removed from runtime.
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
- [ ] Make credit refund behavior idempotent and queryable without reading ad hoc payload flags. **Started 2026-05-12:** refund lifecycle is now mirrored into `ai_usage_events` for create generation, redesign, async AI tool jobs, worker failure, and cancel paths; existing `_refunded` payload flags still remain as the idempotency guard.
- [x] Build minimal operator dashboard with users, AI jobs, credit transactions, payments, cost summary, and feedback. **Started 2026-05-12:** added token-protected `/api/internal/operator-summary` and a minimal `/operator` dashboard for users, job status, AI usage/cost, credits, storage payments, and recent failures/refunds. Feedback-specific rows still depend on the export feedback capture task below.
- [ ] Add export feedback capture: "hasil ini membantu?" with `design_id`, `job_id`, `user_id`, rating, and free-text note.
- [ ] Review every `UploadFile` endpoint for `validate_uploaded_image`, max size, quota, and rate limit consistency.
- [ ] Add production guardrails to fail loudly when required AI/payment/storage env vars are missing.
- [ ] Finish docs cleanup for legacy `quantum-engine` references in `docs/architecture/*`.

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
- [ ] Add weekly beta review dashboard/query:
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
5. Day 10: Clean remaining docs drift and write beta runbook with rollback steps.

## Beta Acceptance Criteria

- Operator can answer, within 5 minutes, how many users signed up, created, exported, paid, repeated, failed generation, and consumed credits this week.
- Every paid/credit-changing AI operation can be reconciled from user action to provider/model to credit transaction to refund if any.
- A failed AI generation never silently consumes credits.
- A seller can complete upload -> generate -> edit -> export without needing help.
- Privacy/TOS/data deletion/third-party AI provider disclosure are visible before paid beta.
- Marketplace work remains blocked until repeat usage and paid conversion are measured.
