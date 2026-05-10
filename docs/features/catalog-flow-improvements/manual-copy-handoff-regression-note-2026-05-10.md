---
title: Manual Copy Handoff Regression Note
date: 2026-05-10
status: verified
scope:
  - frontend/src/app/design/new/preview/page.tsx
  - frontend/src/app/create/hooks/useCreateDesign.ts
  - frontend/tests/e2e/design-brief-interview.spec.ts
  - frontend/tests/e2e/design-brief-preview.spec.ts
  - frontend/tests/e2e/create-preview-handoff.spec.ts
---

# Summary

Perbaikan ini mengunci flow explicit/manual copy dari design brief interview -> preview -> legacy create, plus regression guard untuk warning headline non-blocking.

# Root cause found

1. Preview -> legacy create hanya menyimpan `briefAnswers`, belum menyimpan `manualCopyOverrides`.
2. `briefAnswers.useAiCopyAssist` dari handoff terserialisasi sebagai boolean, tetapi parser restore di legacy create hanya menerima string `"true"` / `"false"`.
3. Akibatnya, manual-copy mode bisa balik ke default `true` saat restore meskipun user sudah mematikan AI copy assist.

# Product changes applied

## 1) Preview -> legacy handoff now persists manual copy explicitly
File: `frontend/src/app/design/new/preview/page.tsx`

- Menambahkan field ke `briefAnswers` saat klik `Pakai engine lama`:
  - `headlineOverride`
  - `subHeadlineOverride`
  - `ctaOverride`
  - `productName`
  - `offerText`
  - `useAiCopyAssist`
- Menambahkan object `manualCopyOverrides` ke `smartdesign_create_state` agar legacy create punya source of truth yang eksplisit.
- Menjaga parity field override saat preview masih memilih generate AI.

## 2) Legacy create restore now accepts boolean OR string
File: `frontend/src/app/create/hooks/useCreateDesign.ts`

- `parseBooleanString()` diubah agar menerima:
  - `true`
  - `false`
  - `"true"`
  - `"false"`
- Restore `manualCopyOverrides.useAiCopyAssist` sekarang tidak fallback keliru ke default `true` saat source value berupa boolean.

# Regression tests added/updated

## `frontend/tests/e2e/design-brief-interview.spec.ts`
- Guard untuk warning headline panjang yang tetap non-blocking.
- Guard bahwa manual overrides + `AI assist off` benar-benar tampil di preview.
- Added mocked catalog planner endpoints supaya flow katalog stabil di E2E.

## `frontend/tests/e2e/design-brief-preview.spec.ts`
- Guard bahwa summary preview memakai label UI Indonesia terbaru.
- Guard bahwa skip-AI photo mode membuka editor tanpa memanggil `/designs/generate`.
- Guard bahwa `Pakai engine lama` menulis `smartdesign_create_state` lengkap, termasuk `manualCopyOverrides`.

## `frontend/tests/e2e/create-preview-handoff.spec.ts`
- Guard bahwa legacy create me-restore semua field manual copy.
- Guard bahwa CTA `Lanjut Rapikan di Editor` tetap bisa handoff ke editor dengan mocked project creation.

# Verification run

Executed successfully on 2026-05-10:

```bash
cd /Users/nugroho/Documents/design-studio/frontend
npm run lint
npm run build
PLAYWRIGHT_AUTH_BYPASS=true npx playwright test tests/e2e/design-brief-interview.spec.ts --project=chromium
PLAYWRIGHT_AUTH_BYPASS=true npx playwright test tests/e2e/design-brief-preview.spec.ts --project=chromium
PLAYWRIGHT_AUTH_BYPASS=true npx playwright test tests/e2e/create-preview-handoff.spec.ts --project=chromium
```

Result:
- lint: pass
- build: pass
- design-brief-interview.spec.ts: 3 passed
- design-brief-preview.spec.ts: 5 passed
- create-preview-handoff.spec.ts: 2 passed

# Review notes

No blocker found in the touched scope after verification.

Points to remember:
- Repo masih punya banyak modified files di luar scope task ini; commit sebaiknya selective, bukan `git commit -am`.
- Test harness design routes di local dev butuh `PLAYWRIGHT_AUTH_BYPASS=true` agar protected-route E2E konsisten.
- Handoff bug ini worth dipertahankan sebagai regression suite permanen karena failure mode-nya silent: UI tampak jalan, tapi intent manual-copy user hilang saat restore.
