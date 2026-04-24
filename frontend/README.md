# SmartDesign Studio — Frontend

Next.js 16 frontend for the SmartDesign Studio AI graphic design platform.

## Quick Start

```bash
npm install --legacy-peer-deps
npm run dev    # http://localhost:3000
```

## Key Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint check
npx tsc --noEmit # TypeScript type check
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page (dark mode, glassmorphism) |
| `/create` | **5-step AI generation flow** (lihat di bawah) |
| `/edit/[projectId]` | Konva.js canvas editor |
| `/projects` | Saved projects gallery |
| `/forgot-password` | Request link reset password |
| `/reset-password` | Form atur ulang password |

## Create Page — AI Generation Flow

```
[1] Input Teks + Format & Gaya
        ↓ "Bantu Saya Perjelas"
[2] AI Interview — 3-4 pertanyaan dari Gemini (chip / text input)
        ↓ "Buat Prompt AI" atau "Lewati"
[3] Visual Prompt Review — edit/toggle tiap bagian prompt
        ↓ "Generate Gambar AI"
[4] Generating (animasi progress)
        ↓
[5] Preview & Editor — tweak prompt, lihat history, masuk editor
```

### Komponen Utama (`src/components/create/`)

| Komponen | Fungsi |
|----------|--------|
| `SidebarInputForm.tsx` | Form teks deskripsi + upload referensi + format & gaya |
| `SidebarActionBar.tsx` | Tombol aksi kontekstual (berubah sesuai step aktif) |
| `DesignBriefInterview.tsx` | Form AI interview — render chip pilihan & text input dari JSON API |
| `VisualPromptEditor.tsx` | Review & edit bagian-bagian prompt visual |
| `GenerationProgress.tsx` | Loading screen saat generate gambar |
| `UnifiedPreviewEditor.tsx` | Preview gambar + history + tombol lanjut ke editor |

### State Management (`create/page.tsx`)

State yang di-persist ke `localStorage`:

| State | Tipe | Fungsi |
|-------|------|--------|
| `currentStep` | `'input' \| 'brief' \| 'prompt-review' \| 'generating' \| 'preview'` | Step aktif |
| `briefQuestions` | `BriefQuestion[]` | Pertanyaan dari AI |
| `briefAnswers` | `Record<string, string>` | Jawaban user |
| `parsedData` | `ParsedDesignData` | Hasil parse dari backend |
| `imageHistory` | `{url, prompt}[]` | Riwayat gambar yang di-generate |

## E2E Testing — Playwright

All E2E specs in `tests/e2e/` use Playwright with role-based locators.

### Running Tests Locally

```bash
# Start frontend dev server first
npm run dev

# In another terminal:
npx playwright test                          # All specs, chromium only
npx playwright test --project=firefox        # Test Firefox
npx playwright test --project=webkit         # Test WebKit
npx playwright test --project="Mobile Chrome" # Test mobile viewport
npx playwright test --reporter=html          # Generate HTML report
npx playwright show-report                   # View last HTML report
```

### CI Execution Strategy

- **Fast Smoke** (GitHub Actions CI, ~2 min):
  - `tools-hub-navigation.spec.ts`
  - `tools-transform.spec.ts`
  - `user-settings-and-profile.spec.ts`
  - `account-destructive-actions.spec.ts`
  - `brand-kit-workflow.spec.ts`

- **Authenticated Core** (GH Actions, ~5 min):
  - Adds: `critical-journey.spec.ts`, `intent-first-entry.spec.ts`, `asset-library-management.spec.ts`, `session-expiry-and-reauth.spec.ts`

- **AI-Heavy Tools** (Manual/Nightly, requires Celery worker + Redis):
  - `tools-retouch.spec.ts`, `tools-product-scene.spec.ts`, `tools-batch-process.spec.ts`, `tools-magic-eraser.spec.ts`, `tools-generative-expand.spec.ts`, `tools-watermark-placer.spec.ts`
  - **Prerequisites**: Backend + Celery worker at `localhost:6380` + demo user with sufficient credits

- **Mobile & Cross-Browser** (Optional nightly):
  - `responsive-design-mobile.spec.ts` on Mobile Chrome & Mobile Safari
  - All smoke tests promoted to Firefox & WebKit

### Runtime Prerequisites (Local E2E)

1. **Frontend**: `npm run dev` at `http://localhost:3000`
2. **Backend**: FastAPI at `http://localhost:8000` (for auth login)
3. **Demo User**: Seeded via `backend/create_test_user.py` — `demo@example.com` / `password123`
4. **For AI tool flows**: Celery worker at localhost:6380 + sufficient test credits

### Triage & Debugging

- **Timeouts**: Usually mean backend/worker not running or credits exhausted
- **Selector failures**: Check if UI changed; use `--reporter=html` to view traces
- **Intermittent flakes**: Enable `--retries=2` or check async state in network tab

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Canvas:** Konva.js + react-konva
- **State:** Zustand + React `useState` (localStorage persistence)
- **UI:** shadcn/ui + Tailwind CSS
- **Auth:** NextAuth.js (Google OAuth)
- **Export:** jsPDF, canvas toDataURL
- **Onboarding:** react-joyride
- **Monitoring:** posthog-js, backend structured logging
