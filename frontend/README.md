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

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Canvas:** Konva.js + react-konva
- **State:** Zustand + React `useState` (localStorage persistence)
- **UI:** shadcn/ui + Tailwind CSS
- **Auth:** NextAuth.js (Google OAuth)
- **Export:** jsPDF, canvas toDataURL
- **Onboarding:** react-joyride
- **Monitoring:** posthog-js, backend structured logging
