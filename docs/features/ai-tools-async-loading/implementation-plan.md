---
goal: End-to-end async execution and transparent loading UX for AI Photo Tools
version: 1.0
date_created: 2026-03-23
status: Planned
tags: [feature, refactor, infrastructure, migration]
---

# Implementation Plan: AI Photo Tools Async Pipeline & Informative Loading

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

## 1. Requirements & Constraints

- **REQ-001**: User must see clear progress states for AI tools (`uploading`, `processing`, `saving`, `completed`, `failed`).
- **REQ-002**: User should not be blocked on long HTTP requests; heavy tools must run as async jobs.
- **REQ-003**: User can leave page and still track status/results from history/my-assets.
- **REQ-004**: Existing credit and refund behavior must remain correct under async execution.
- **REQ-005**: Errors shown to user must be friendly and actionable; stack traces stay server-side.
- **REQ-006**: Keep current design system (shadcn/ui + Tailwind tokens) without adding new visual themes.
- **SEC-001**: All job endpoints must enforce auth + ownership checks.
- **SEC-002**: All input payloads validated with Pydantic/Zod; reject unsupported MIME/oversized files.
- **SEC-003**: Rate limit remains active for job creation/status polling.
- **CON-001**: Maintain compatibility with existing `/api/tools/*` behavior during migration window.
- **CON-002**: No hardcoded secrets; keep env-based config.

## 2. Implementation Steps

### Phase 1: Baseline, Metrics, and Contract

- **GOAL-001**: Establish measurable baseline and define the unified loading contract before refactor.

| Task | Description | File(s) | Completed |
|------|-------------|---------|-----------|
| TASK-001 | Add structured timing logs per step (`upload`, `infer`, `download`, `save`) in tool routers | `backend/app/api/ai_tools_routers/enhancement.py`, `backend/app/api/ai_tools_routers/background.py`, `backend/app/api/ai_tools_routers/creative.py` | |
| TASK-002 | Define shared frontend loading state type and copy dictionary | `frontend/src/lib/api/types.ts`, `frontend/src/lib/api/aiToolsApi.ts` | |
| TASK-003 | Add request correlation IDs, structured timing logs, and PostHog client events for tool name + phase + duration | `frontend/src/providers/PostHogProvider.tsx`, `backend/app/main.py` | |
| TASK-004 | Publish latency SLO targets (P50/P95) and timeout policy | `docs/features/ai-tools-async-loading/implementation-plan.md` (section update) | |

### Phase 2: Async Job Backend for Heavy Tools

- **GOAL-002**: Move heavy tools from synchronous request-response to job-based execution.

| Task | Description | File(s) | Completed |
|------|-------------|---------|-----------|
| TASK-005 | Introduce generic AI tool job model + status enum | `backend/app/models/` (new `ai_tool_job.py`) | |
| TASK-006 | Add Alembic migration for `ai_tool_jobs` table + indexes | `backend/alembic/versions/*_add_ai_tool_jobs.py` | |
| TASK-007 | Create service layer for job lifecycle (create, update progress, finalize, fail) | `backend/app/services/ai_tool_job_service.py` | |
| TASK-008 | Add Celery tasks per heavy tool (`upscale`, `retouch`, `background_swap`, `product_scene`, `generative_expand`, `batch`) | `backend/app/workers/tasks.py` | |
| TASK-009 | Add API endpoints for job creation and polling | `backend/app/api/ai_tools_routers/jobs.py`, `backend/app/api/ai_tools.py` | |
| TASK-010 | Keep legacy sync endpoints behind feature flag for rollback | `backend/app/api/ai_tools_routers/*.py`, `backend/app/core/config.py` | |

### Phase 3: Progress Events and UX Loading Orchestration

- **GOAL-003**: Deliver transparent waiting experience with real phase progress and cancel/retry actions.

| Task | Description | File(s) | Completed |
|------|-------------|---------|-----------|
| TASK-011 | Add unified `ToolLoadingState` hook (phase, message, percent, ETA) | `frontend/src/hooks/useToolJobProgress.ts` | |
| TASK-012 | Add reusable loading panel component for tools pages | `frontend/src/components/tools/ToolProcessingState.tsx` | |
| TASK-013 | Integrate async submit + polling in upscaler page | `frontend/src/app/tools/upscaler/page.tsx` | |
| TASK-014 | Integrate async submit + polling in retouch page | `frontend/src/app/tools/retouch/page.tsx` | |
| TASK-015 | Integrate async submit + polling in background-swap page | `frontend/src/app/tools/background-swap/page.tsx` | |
| TASK-016 | Extend integration to product-scene, generative-expand, batch | `frontend/src/app/tools/product-scene/page.tsx`, `frontend/src/app/tools/generative-expand/page.tsx`, `frontend/src/app/tools/batch-process/page.tsx` | |
| TASK-017 | Add `Cancel` + `Retry` UX with optimistic UI transitions | same files above + `frontend/src/lib/api/aiToolsApi.ts` | |

### Phase 4: Reliability, Credits, and Idempotency

- **GOAL-004**: Ensure financial and operational safety under retries, failures, and refreshes.

| Task | Description | File(s) | Completed |
|------|-------------|---------|-----------|
| TASK-018 | Make credit charge idempotent by `job_id` transaction key | `backend/app/services/credit_service.py` | |
| TASK-019 | Centralize refund policy on terminal failed/canceled jobs only | `backend/app/services/ai_tool_job_service.py`, `backend/app/api/ai_tools_routers/*.py` | |
| TASK-020 | Add retry strategy for transient provider/network errors | `backend/app/services/*_service.py`, `backend/app/workers/tasks.py` | |
| TASK-021 | Add cleanup policy for stale temp uploads and dead jobs | `backend/app/workers/tasks.py`, `backend/scripts/clean_templates.py` (or new cleanup script) | |

### Phase 5: Rollout, Compatibility, and Decommission

- **GOAL-005**: Roll out safely, monitor impact, then remove legacy sync path.

| Task | Description | File(s) | Completed |
|------|-------------|---------|-----------|
| TASK-022 | Add feature flag per tool for async mode | `backend/app/core/config.py`, `frontend/src/lib/api/aiToolsApi.ts` | |
| TASK-023 | Canary rollout: 10% → 50% → 100% traffic | deployment config + runtime env | |
| TASK-024 | Compare baseline vs post-rollout metrics | dashboards / structured logs / PostHog | |
| TASK-025 | Remove legacy sync implementation after stabilization | `backend/app/api/ai_tools_routers/*.py`, `frontend/src/lib/api/aiToolsApi.ts` | |

## 3. Architecture Diagram

```mermaid
graph TD
  A[Frontend Tools Page] --> B[POST /api/tools/jobs]
  B --> C[FastAPI Job Router]
  C --> D[(PostgreSQL: ai_tool_jobs)]
  C --> E[Celery Queue]
  E --> F[Worker: AI Tool Task]
  F --> G[fal.ai / external AI provider]
  F --> H[Storage Service]
  F --> D
  A --> I[GET /api/tools/jobs/{id} polling]
  I --> C
  C --> D
```

## 4. API Design

- `POST /api/tools/jobs`
  - Description: Create async job for selected AI tool.
  - Request:
    - `tool_name: "upscale" | "retouch" | "background_swap" | "product_scene" | "generative_expand" | "batch"`
    - `payload: object` (tool-specific validated schema)
    - `idempotency_key?: string`
  - Response:
    - `job_id: string`
    - `status: "queued"`
    - `created_at: datetime`

- `GET /api/tools/jobs/{job_id}`
  - Description: Get latest progress for one job (owner-only).
  - Response:
    - `job_id: string`
    - `status: "queued" | "uploading" | "processing" | "saving" | "completed" | "failed" | "canceled"`
    - `progress_percent: number`
    - `phase_message: string`
    - `result_url?: string`
    - `error_message?: string`
    - `started_at?: datetime`
    - `finished_at?: datetime`

- `POST /api/tools/jobs/{job_id}/cancel`
  - Description: Mark cancel requested and stop if worker not terminal yet.
  - Response:
    - `job_id: string`
    - `status: "canceled" | "cancel_requested"`

- `GET /api/tools/my-jobs?tool_name=&limit=&offset=`
  - Description: Paginated user job history for cross-page continuity.

## 5. Database Changes

- New table: `ai_tool_jobs`
  - Core columns: `id`, `user_id`, `tool_name`, `status`, `payload_json`, `result_url`, `error_message`, `progress_percent`, `provider_latency_ms`, `created_at`, `started_at`, `finished_at`, `idempotency_key`.
- Indexes:
  - `(user_id, created_at desc)` for history listing.
  - `(status, created_at)` for worker/cleanup scans.
  - unique `(user_id, idempotency_key)` when key exists.
- Alembic:
  - `alembic revision --autogenerate -m "add_ai_tool_jobs_table"`

## 6. Frontend Changes

- New shared primitives:
  - `useToolJobProgress` hook for polling, cancel, retry, timeout adaptation.
  - `ToolProcessingState` component with stage timeline + ETA text + action buttons.
- Pages migrated:
  - `/tools/upscaler`
  - `/tools/retouch`
  - `/tools/background-swap`
  - `/tools/product-scene`
  - `/tools/generative-expand`
  - `/tools/batch-process`
- API client:
  - Add `createToolJob`, `getToolJob`, `cancelToolJob`, `getMyToolJobs` to `useAiToolsEndpoints`.

## 7. Testing

| Test | Type | File |
|------|------|------|
| TEST-001 | pytest unit (job lifecycle transitions) | `backend/tests/test_ai_tool_job_service.py` |
| TEST-002 | pytest API (auth + ownership + status polling) | `backend/tests/test_ai_tools_jobs_api.py` |
| TEST-003 | pytest worker (success/failure/refund/idempotency) | `backend/tests/test_ai_tools_worker_tasks.py` |
| TEST-004 | Playwright E2E (upscaler async progress + completion) | `frontend/tests/e2e/tools-upscaler-async.spec.ts` |
| TEST-005 | Playwright E2E (retouch cancel + retry) | `frontend/tests/e2e/tools-retouch-async.spec.ts` |
| TEST-006 | Playwright E2E (background-swap timeout messaging) | `frontend/tests/e2e/tools-background-swap-async.spec.ts` |

## 8. Risks & Assumptions

- **RISK-001**: External provider latency spikes increase queue time.
  - Mitigation: expose queue vs processing phase separately; show realistic ETA ranges.
- **RISK-002**: Double credit charge from retries/re-submits.
  - Mitigation: idempotency key + transaction guard in credit ledger.
- **RISK-003**: Polling load increases API traffic.
  - Mitigation: adaptive polling interval (`1.5s` active, `3–5s` queued), HTTP caching headers where possible.
- **RISK-004**: Inconsistent UX between migrated and legacy tools during rollout.
  - Mitigation: use one shared loading component and copy source.
- **ASSUMPTION-001**: Redis/Celery infra remains available in all environments.
- **ASSUMPTION-002**: Current storage layer supports large binary throughput for tool outputs.

## 9. Dependencies

- **DEP-001**: Celery + Redis (already present) for async orchestration.
- **DEP-002**: FastAPI + SQLAlchemy + Alembic for job persistence.
- **DEP-003**: Existing `app.services.storage_service` for intermediate and final artifacts.
- **DEP-004**: Structured logging, request IDs, and PostHog events for latency/error observability.

## 10. Success Criteria (Definition of Done)

- P95 perceived waiting satisfaction improves (tracked via reduced manual refresh/retry actions per job).
- P95 API request duration on tools submit endpoint drops significantly (submit returns fast with `job_id`).
- >95% heavy tool operations complete through async job pipeline without manual retry.
- No net credit discrepancies in success/failure/cancel paths after rollout.
- Legacy sync endpoints removed (or disabled) after two stable release cycles.

## 11. Sprint Backlog & Estimation

### Sprint 1 (Foundation) — Est. 5 working days

- **Objective**: Build backend async job foundation + observability baseline without breaking existing endpoints.
- **Scope**: TASK-001, TASK-003, TASK-005, TASK-006, TASK-007, TASK-009 (read-only polling first).

| Item | Owner | Est. | Dependency | Output |
|------|-------|------|------------|--------|
| S1-001 | Backend | 1d | - | Structured timing logs in current routers |
| S1-002 | Backend | 1d | S1-001 | `ai_tool_jobs` model + migration |
| S1-003 | Backend | 1.5d | S1-002 | Job lifecycle service + status transitions |
| S1-004 | Backend | 1d | S1-003 | `POST /api/tools/jobs` + `GET /api/tools/jobs/{id}` |
| S1-005 | FE + Backend | 0.5d | S1-001 | Correlation IDs + PostHog events for tool phases |

- **Sprint 1 Exit Criteria**:
  - Job record created and queryable end-to-end.
  - No regression on existing sync endpoints.
  - Basic pytest coverage for model/service/API passes.

### Sprint 2 (Core UX + 3 Tools) — Est. 7 working days

- **Objective**: Deliver user-visible waiting improvement on top 3 tools.
- **Scope**: TASK-008 (partial), TASK-011, TASK-012, TASK-013, TASK-014, TASK-015, TASK-017 (partial).

| Item | Owner | Est. | Dependency | Output |
|------|-------|------|------------|--------|
| S2-001 | Backend | 2d | Sprint 1 | Worker tasks for `upscale`, `retouch`, `background_swap` |
| S2-002 | Frontend | 1.5d | Sprint 1 | `useToolJobProgress` hook + unified state machine |
| S2-003 | Frontend | 1d | S2-002 | `ToolProcessingState` reusable component |
| S2-004 | Frontend | 1d | S2-001,S2-003 | Upscaler async integration |
| S2-005 | Frontend | 1d | S2-001,S2-003 | Retouch async integration |
| S2-006 | Frontend | 1d | S2-001,S2-003 | Background-swap async integration |
| S2-007 | QA | 0.5d | S2-004..006 | E2E happy path + failure path for 3 tools |

- **Sprint 2 Exit Criteria**:
  - User sees phase-based progress (`uploading`, `processing`, `saving`).
  - Submit endpoint returns fast with `job_id` on 3 migrated tools.
  - Cancel and retry available at UI level for those tools.

### Sprint 3 (Reliability + Remaining Tools) — Est. 6 working days

- **Objective**: Finish migration for remaining heavy tools and harden financial correctness.
- **Scope**: TASK-016, TASK-018, TASK-019, TASK-020, TASK-021.

| Item | Owner | Est. | Dependency | Output |
|------|-------|------|------------|--------|
| S3-001 | Backend | 1d | Sprint 1 | Worker tasks for `product_scene`, `generative_expand`, `batch` |
| S3-002 | Frontend | 1.5d | S3-001 | Async UI integration for remaining tools |
| S3-003 | Backend | 1.5d | Sprint 1 | Credit idempotency by `job_id` |
| S3-004 | Backend | 1d | S3-003 | Unified refund policy and terminal-state guards |
| S3-005 | Backend | 0.5d | S3-001 | Transient retry policy (provider/network) |
| S3-006 | Backend | 0.5d | Sprint 1 | Stale temp file + dead-job cleanup policy |

- **Sprint 3 Exit Criteria**:
  - All heavy tools run via async jobs.
  - No duplicate charge/refund for retries.
  - Reliability tests for failure/cancel/retry pass.

### Sprint 4 (Rollout & Decommission) — Est. 4 working days

- **Objective**: Roll out safely to production and retire legacy sync path.
- **Scope**: TASK-022, TASK-023, TASK-024, TASK-025.

| Item | Owner | Est. | Dependency | Output |
|------|-------|------|------------|--------|
| S4-001 | Backend + FE | 0.5d | Sprint 2 | Feature flags per tool for async mode |
| S4-002 | DevOps | 1d | S4-001 | Canary rollout 10% → 50% → 100% |
| S4-003 | QA + Product | 1d | S4-002 | Metrics validation vs baseline |
| S4-004 | Backend + FE | 1.5d | S4-003 | Remove/disable legacy sync endpoints |

- **Sprint 4 Exit Criteria**:
  - SLO targets met for latency and completion.
  - Error and retry rates stable post rollout.
  - Legacy path removed or permanently gated off.

### Prioritization Rules

- **P0**: `upscale`, `retouch`, `background_swap` migration and unified loading UX.
- **P1**: `product_scene`, `generative_expand`, `batch` migration.
- **P2**: decommission and cleanup optimization.

### Team Capacity Assumption

- 1 backend engineer, 1 frontend engineer, 1 QA (shared), 1 DevOps (part-time).
- Total estimate: **~22 working days** (4 sprints, with parallel FE/BE tasks).
