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
| `/create` | AI generation form + onboarding tour |
| `/edit/[projectId]` | Konva.js canvas editor |
| `/projects` | Saved projects gallery |

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Canvas:** Konva.js + react-konva
- **State:** Zustand
- **UI:** shadcn/ui + Tailwind CSS
- **Auth:** NextAuth.js (Google OAuth)
- **Export:** jsPDF, canvas toDataURL
- **Onboarding:** react-joyride
- **Monitoring:** @sentry/nextjs, posthog-js
