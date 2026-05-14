# Phase 4 Closeout Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Menutup gap Phase 4 Seller-First Activation supaya flow seller-first benar-benar terhubung end-to-end, template platform bisa diverifikasi lewat API/runtime, dan dokumen launch readiness mencerminkan status aktual.

**Architecture:** Pertahankan arsitektur yang sudah ada: seller wizard menulis prefill ke `sessionStorage`, interview page membaca dan meng-hydrate state itu sekali saat load, lalu preview/generate memakai state yang sama. Backend template API tetap jadi source of truth untuk filter template, dengan coverage test untuk query/filter platform. Dokumentasi launch readiness diperbarui setelah bukti verifikasi build/test terkumpul.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, FastAPI + SQLAlchemy + Alembic, pytest, ESLint, Next build.

---

## Phase 0 — Baseline & Scope Lock

### Task 0.1: Reconfirm runtime files and current gaps

**Objective:** Pastikan file target dan gap audit masih sesuai kondisi working tree saat implementasi dimulai.

**Files:**
- Inspect: `frontend/src/app/design/new/interview/page.tsx`
- Inspect: `frontend/src/components/create/SellerChannelWizard.tsx`
- Inspect: `frontend/src/lib/api/projectApi.ts`
- Inspect: `backend/app/api/templates.py`
- Inspect: `backend/tests/test_templates.py`
- Inspect: `LAUNCH_READINESS.md`

**Step 1: Check git working tree**

Run: `git -C /Users/nugroho/Documents/design-studio status --short`
Expected: seller-first and template-related files still present in working tree.

**Step 2: Reconfirm gap signatures**

Run:
- `rg -n "sessionStorage|getItem|useSearchParams|from=seller|sellerChannel|promoType" frontend/src/app/design/new/interview/page.tsx`
- `rg -n "platform" backend/app/api/templates.py frontend/src/lib/api/projectApi.ts backend/tests/test_templates.py`

Expected:
- interview page has write path but no hydration path
- backend API has platform filter but tests/api client coverage is incomplete

**Step 3: Commit**

Do not commit in this task.

---

## Phase 1 — Seller Prefill Hydration

### Task 1.1: Add failing backend-free verification for interview hydration behavior

**Objective:** Create a reproducible verification target for seller prefill hydration before modifying production code.

**Files:**
- Create: `docs/launch/2026-05-14-phase-4-readiness-check.md`
- Modify later: `frontend/src/app/design/new/interview/page.tsx`

**Step 1: Document the exact expected hydration contract**

Add to the audit doc a checklist stating that when seller wizard stores a brief with:
- `goal`
- `productType`
- `style`
- `channel`
- `copyTone`
- `notes`
- `sellerChannel`
- `promoType`

then interview page must render with those values preselected on first load.

**Step 2: Define manual RED check**

Record manual verification steps in the doc:
1. Open `/design/new/seller`
2. Pick platform + promo
3. Arrive on `/design/new/interview?...`
4. Confirm fields are already selected / prefilled

Expected before fix: fields are mostly blank/generic.

**Step 3: Commit**

Do not commit in this task.

### Task 1.2: Implement one-time hydration from session storage in interview page

**Objective:** Make interview page consume seller-first prefill state once, without causing render loops.

**Files:**
- Modify: `frontend/src/app/design/new/interview/page.tsx`
- Reference: `frontend/src/lib/design-brief-session.ts`
- Reference: `frontend/src/components/create/SellerChannelWizard.tsx`

**Step 1: Add hydration guard**

Introduce a `useRef(false)` guard such as `hasHydratedPrefillRef` near the other refs/state.

**Step 2: Read session state on mount after auth is known**

Add a `useEffect` that:
- returns early unless `status === "authenticated"`
- returns early if hydration already ran
- reads `window.sessionStorage.getItem(DESIGN_BRIEF_SESSION_KEY)`
- safely parses JSON
- applies prefilled values using existing setters only when target field is still empty/default

Prefill mappings:
- `goal -> setGoal`
- `productType -> setProductType` (and custom type if needed)
- `style -> setStyle`
- `channel -> setChannel`
- `copyTone -> setCopyTone`
- `notes -> setNotes`
- `useAiCopyAssist -> setUseAiCopyAssist`
- `headlineOverride`, `subHeadlineOverride`, `ctaOverride`, `productName`, `offerText`
- `productImageUrl` and filename only if present

**Step 3: Preserve existing user edits**

Hydration must not overwrite user-entered state once field already has value in the page state.

**Step 4: Add seller-prefill analytics event**

Capture one event like `design_brief_interview_prefilled` with `sellerChannel` and `promoType` if present.

**Step 5: Verify no render loop / no auth break**

Run:
- `cd /Users/nugroho/Documents/design-studio/frontend && npm run lint`
- `cd /Users/nugroho/Documents/design-studio/frontend && npx next build`

Expected: pass, no hook dependency loop.

**Step 6: Commit**

```bash
git -C /Users/nugroho/Documents/design-studio add frontend/src/app/design/new/interview/page.tsx
git -C /Users/nugroho/Documents/design-studio commit -m "feat: hydrate seller prefill in interview flow"
```

### Task 1.3: Manual verify seller-first happy path through interview

**Objective:** Prove the intended prefill behavior works in the browser flow.

**Files:**
- Verify: `frontend/src/app/design/new/seller/page.tsx`
- Verify: `frontend/src/components/create/SellerChannelWizard.tsx`
- Verify: `frontend/src/app/design/new/interview/page.tsx`

**Step 1: Run frontend locally if needed**

Run: `cd /Users/nugroho/Documents/design-studio/frontend && npm run dev`

**Step 2: Execute manual scenario**

Scenario example:
- choose `Shopee`
- choose `Flash Sale`
- land on interview page

Verify:
- goal is prefilled to promo
- channel is prefilled to marketplace/expected mapped value
- style is prefilled
- notes text mentions flash sale context
- copy tone default is prefilled

**Step 3: Record evidence**

Write result into `docs/launch/2026-05-14-phase-4-readiness-check.md`.

**Step 4: Commit**

Include doc update together with implementation commit if not yet committed.

---

## Phase 2 — Template Platform API Coverage & Runtime Verification

### Task 2.1: Write failing backend tests for platform filter and response shape

**Objective:** Add explicit test coverage for the new `platform` query/filter path.

**Files:**
- Create or modify: `backend/tests/test_templates_api.py`
- Reference: `backend/app/api/templates.py`
- Reference: `backend/tests/test_ai_tools.py` for dependency override patterns if needed

**Step 1: Write failing tests first**

Add tests covering at minimum:
- GET `/api/templates/?platform=shopee` returns only shopee-tagged templates
- template list payload includes `platform`
- GET `/api/templates/{id}` payload includes `platform`

Prefer isolated DB fixture / dependency override over production DB assumptions.

**Step 2: Run targeted tests to verify RED**

Run: `cd /Users/nugroho/Documents/design-studio && .venv/bin/python -m pytest backend/tests/test_templates_api.py -q`
Expected: FAIL before implementation/fixture support is complete.

**Step 3: Commit**

Do not commit in RED state.

### Task 2.2: Make API client support optional platform filter

**Objective:** Propagate platform query capability to frontend API layer so runtime can actually consume it.

**Files:**
- Modify: `frontend/src/lib/api/projectApi.ts`
- Modify: `frontend/src/components/templates/TemplateBrowser.tsx`

**Step 1: Extend `getTemplates` signature**

Change from:
- `getTemplates(category?: string, aspectRatio?: string)`

to:
- `getTemplates(category?: string, aspectRatio?: string, platform?: string)`

Add `platform` to `URLSearchParams` only when present.

**Step 2: Extend template type shape**

Add `platform?: string | null` to `TemplateData` in `TemplateBrowser.tsx`.

**Step 3: Keep backwards compatibility**

Existing call sites without platform must continue working unchanged.

**Step 4: Verify**

Run:
- `cd /Users/nugroho/Documents/design-studio/frontend && npm run lint`
- `cd /Users/nugroho/Documents/design-studio/frontend && npx next build`

Expected: pass.

**Step 5: Commit**

```bash
git -C /Users/nugroho/Documents/design-studio add frontend/src/lib/api/projectApi.ts frontend/src/components/templates/TemplateBrowser.tsx
git -C /Users/nugroho/Documents/design-studio commit -m "feat: add platform-aware template api client"
```

### Task 2.3: Implement minimal backend support required by failing tests

**Objective:** Ensure backend tests pass using the already-added API behavior and fixtures.

**Files:**
- Modify if needed: `backend/app/api/templates.py`
- Modify if needed: `backend/tests/test_templates_api.py`

**Step 1: Make the minimal fix only if tests show a real gap**

Likely no major production logic changes are needed because filter is already implemented; this task is for fixture/test plumbing and any missing response details only.

**Step 2: Run targeted tests to GREEN**

Run: `cd /Users/nugroho/Documents/design-studio && .venv/bin/python -m pytest backend/tests/test_templates_api.py -q`
Expected: PASS.

**Step 3: Run broader backend suite**

Run: `cd /Users/nugroho/Documents/design-studio && .venv/bin/python -m pytest backend/tests/ -q`
Expected: PASS.

**Step 4: Commit**

```bash
git -C /Users/nugroho/Documents/design-studio add backend/app/api/templates.py backend/tests/test_templates_api.py
git -C /Users/nugroho/Documents/design-studio commit -m "test: cover template platform filtering api"
```

### Task 2.4: Verify template supply in runtime data path

**Objective:** Confirm Phase 4 template count is not only present in source code but also accessible through runtime path.

**Files:**
- Verify: `backend/scripts/seed_templates.py`
- Verify: `backend/alembic/versions/6bcc67eb49fd_add_platform_to_templates.py`
- Document: `docs/launch/2026-05-14-phase-4-readiness-check.md`

**Step 1: Confirm migration state**

Run: `cd /Users/nugroho/Documents/design-studio/backend && .venv/bin/alembic heads`
Expected: single head `6bcc67eb49fd`.

**Step 2: Confirm seeded source counts**

Run a small script or command to count:
- total template entries
- count with non-null `platform`

Expected: total >= 20 and platform-tagged entries present.

**Step 3: If local DB seeding path is available, validate via API/DB**

Run the seed script against local/dev DB if safe, then query `/api/templates/?platform=shopee` or equivalent DB query.

**Step 4: Record evidence and any limit**

Document whether runtime validation was:
- fully verified against DB/API, or
- limited to code + migration + test evidence only

---

## Phase 3 — Launch Readiness Documentation Update

### Task 3.1: Update launch readiness doc to reflect current Phase 4 status

**Objective:** Replace stale “ready to move into Phase 4” wording with current verified status.

**Files:**
- Modify: `LAUNCH_READINESS.md`

**Step 1: Update executive summary**

Reflect the actual state after implementation:
- seller-first path implemented
- channel-first activation added
- template platform support added/verified
- note any remaining prerequisite if still present

**Step 2: Update Phase 4 section evidence**

Add concrete completion evidence bullets.

**Step 3: Keep Go/No-Go wording honest**

Do not overstate beyond what was verified.

**Step 4: Commit**

```bash
git -C /Users/nugroho/Documents/design-studio add LAUNCH_READINESS.md
git -C /Users/nugroho/Documents/design-studio commit -m "docs: update phase 4 launch readiness status"
```

### Task 3.2: Save audit report with 3-bucket outcome

**Objective:** Preserve the exact readiness assessment in project docs for future reference.

**Files:**
- Create or update: `docs/launch/2026-05-14-phase-4-readiness-check.md`

**Step 1: Add sections**

Required sections:
- scope audited
- evidence gathered
- done in agreed scope
- verification limits / prerequisite failures
- out-of-scope residual risks
- final recommendation

**Step 2: Include commands run and outputs summarized**

Include:
- ruff
- alembic heads
- pytest
- frontend lint
- frontend build
- any manual verification notes

**Step 3: Commit**

```bash
git -C /Users/nugroho/Documents/design-studio add docs/launch/2026-05-14-phase-4-readiness-check.md
git -C /Users/nugroho/Documents/design-studio commit -m "docs: record phase 4 readiness verification"
```

---

## Phase 4 — Final Verification

### Task 4.1: Run mandatory project verification workflow

**Objective:** Ensure all touched backend/frontend code passes project gates.

**Files:**
- Verify whole repo

**Step 1: Backend ruff**

Run: `cd /Users/nugroho/Documents/design-studio/backend && .venv/bin/ruff check .`
Expected: 0 errors.

**Step 2: Alembic head check**

Run:
- `cd /Users/nugroho/Documents/design-studio/backend && .venv/bin/alembic heads`
- `cd /Users/nugroho/Documents/design-studio/backend && .venv/bin/alembic upgrade head`

Expected: exactly one head, upgrade succeeds.

**Step 3: Backend tests**

Run: `cd /Users/nugroho/Documents/design-studio && .venv/bin/python -m pytest backend/tests/ -q`
Expected: full pass.

**Step 4: Frontend lint**

Run: `cd /Users/nugroho/Documents/design-studio/frontend && npm run lint`
Expected: clean.

**Step 5: Frontend build**

Run: `cd /Users/nugroho/Documents/design-studio/frontend && npx next build`
Expected: `✓ Compiled successfully` and no errors.

**Step 6: Manual seller-first sanity check**

Verify once more:
- `/start` -> seller CTA
- `/design/new/seller`
- `/design/new/interview`
- `/design/new/preview`

Expected: seller intent survives through the flow.

### Task 4.2: Final repo status and push readiness

**Objective:** Leave repo in a push-ready state with clear summary.

**Files:**
- Verify whole repo

**Step 1: Check final diff**

Run:
- `git -C /Users/nugroho/Documents/design-studio status --short`
- `git -C /Users/nugroho/Documents/design-studio diff --stat`

**Step 2: Summarize final outcome**

Prepare final report in chat with 3 buckets:
- done in agreed scope
- verification limits/prerequisite failures
- residual risks

**Step 3: Commit/push only after user review**

If user approves:
```bash
git -C /Users/nugroho/Documents/design-studio add -A
git -C /Users/nugroho/Documents/design-studio commit -m "feat: close out phase 4 seller-first launch readiness"
git -C /Users/nugroho/Documents/design-studio push origin main
```

---

## Verification Checklist

- [ ] interview page hydrates seller-first prefill once
- [ ] no React render loop introduced
- [ ] seller-first manual flow verified
- [ ] backend template platform filter explicitly tested
- [ ] frontend API client can request platform-filtered templates
- [ ] launch readiness doc updated to current truth
- [ ] audit report saved in project docs
- [ ] ruff + alembic + pytest + lint + build all green
