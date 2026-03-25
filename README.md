# 🎨 SmartDesign Studio

> **Desain Grafis Instan untuk UMKM** — Platform desain berbasis AI yang membantu pelaku UMKM membuat konten visual profesional dalam hitungan detik.

[![CI/CD](https://github.com/clarinovist/design-studio/actions/workflows/cicd.yml/badge.svg)](https://github.com/clarinovist/design-studio/actions)

---

## ✨ Features

- **AI Design Brief Interview** — Sebelum generate, AI mengajukan 3–4 pertanyaan klarifikasi (mood, warna, objek utama) sehingga prompt yang dihasilkan jauh lebih akurat
- **5-Step Create Flow** — Flow UI intuitif: 1) Input Teks, 2) **AI Interview** (pilihan ganda/teks), 3) Visual Prompt Review, 4) Generating, 5) Split-view Preview & Editor
- **AI Text Parsing** — Gemini Flash menghasilkan headline, tagline, CTA, rekomendasi warna, dan layout JSON dari deskripsi teks
- **AI Image Generation** — Generate background visual profesional via Fal.ai (SDXL/Flux) atau Gemini Imagen sebagai fallback
- **AI Photo Tools (Stand Alone)** — Hapus background foto produk, integrasikan ke latar profesional baru, Text Banner, Retouch & hapus noda/objek, Expand (Outpaint), Watermark, ID Photo, Batch Processing, serta Fitur Image Upscaler untuk menjernihkan & memperbesar foto hingga 4x resolusi. Dilengkapi fitur *Continue to Editor* untuk lanjut mengedit di Canvas utama.
- **AI Background Removal** — Hapus latar belakang foto produk secara instan menggunakan model U<sup>2</sup>-Net (rembg)
- **Brand Kit (AI Color Palette)** — Upload logo UMKM, Gemini Vision otomatis mengekstrak 5 warna dominan. Simpan sebagai palet warna utama yang akan otomatis dipakai di setiap desain berikutnya.
- **AI Copywriting / Headline Generator** — Generate 3 variasi teks promosi (FOMO, Benefit, Social Proof) dari deskripsi produk. Dilengkapi mini-interview klarifikasi, pilihan tone (Persuasif/Kasual/Profesional/Lucu), integrasi Brand Kit, dan re-generate.
- **Canvas Editor** — Editor drag-and-drop berbasis Konva.js dengan:
  - Text & image elements, resize, rotate, drag
  - Fit-to-screen auto-zoom (otomatis menyesuaikan ukuran layar)
  - Layer management: Bring Forward/Backward, Bring to Front/Back (+ keyboard shortcuts `⌘]` `⌘[` `⌘⇧]` `⌘⇧[`)
  - Duplicate element (button + `⌘D`)
  - Opacity slider per-element
  - Solid background color picker
  - Undo/Redo history
  - Delete element (`⌫`)
- **Export Multi-Format** — Download hasil ke PNG, JPG, atau PDF dengan kualitas tinggi
- **Credit System** — 10 kredit gratis untuk generasi AI, dengan rate limiting (10 req/menit)
- **Responsive** — Optimized untuk desktop dan mobile
- **Onboarding Tour** — Panduan interaktif untuk pengguna baru
- **Monitoring** — Sentry (error tracking) + PostHog (product analytics)

---

## 🏗️ Architecture

```
        Client (Browser)
              │
     ┌────────▼─────────┐
     │   Nginx (SSL)    │
     │ desain.nugroho   │
     │  pramono.my.id   │
     └──┬──────────┬────┘
        │ /        │ /api/*
┌───────▼──┐  ┌────▼──────────────┐
│ Frontend │  │  Backend (API)    │
│ Next.js  │  │  FastAPI          │
│ :3000    │  │  :8000            │
└──────────┘  ├────────┬──────────┤
              │ Celery │  Redis   │
              │ Worker │  :6379   │
              └────────┴──────────┘
                       │
              ┌────────▼──────────┐
              │   PostgreSQL      │
              │   :5432           │
              └───────────────────┘
                       │
              ┌────────▼──────────┐
              │  External APIs    │
              │  Gemini · Fal.ai  │
              │  Backblaze · etc  │
              └───────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Konva.js, Zustand, shadcn/ui, Tailwind CSS |
| **Backend** | Python 3.9+, FastAPI, SQLAlchemy 2.0 (async), Pydantic, Alembic |
| **Queue** | Celery 5 + Redis 7 |
| **Database** | PostgreSQL 16 |
| **AI/ML** | Google Gemini Flash (text), Fal.ai SDXL/Flux (image), scikit-learn (color extraction) |
| **Storage** | Backblaze B2 (S3-compatible) |
| **Auth** | NextAuth.js + Google OAuth |
| **Monitoring** | Sentry, PostHog |
| **Infra** | Docker Compose, Nginx (reverse proxy + SSL), Let's Encrypt |
| **CI/CD** | GitHub Actions (Unified Lint, Build, Deploy, Semantic Auto-Tag) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.9
- **Docker** & Docker Compose (for PostgreSQL + Redis)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/clarinovist/design-studio.git
cd design-studio
```

### 2. Configure Environment Variables

```bash
# Backend
cp .env.example backend/.env
nano backend/.env          # Fill in API keys

# Frontend
cp .env.example frontend/.env.local
nano frontend/.env.local   # Fill in API keys & URLs
```

### 3. Start All Services (Docker)

```bash
docker compose up -d --build
```

This starts **5 containers**: PostgreSQL, Redis, Backend API, Celery Worker, Frontend.

### 4. Run Database Migrations

```bash
docker compose exec backend alembic upgrade head
```

### 5. Seed Templates (optional)

```bash
docker compose exec backend python scripts/seed_templates.py
```

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| Swagger Docs | http://localhost:8000/docs |

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `NEXTAUTH_SECRET` | ✅ | Random secret for JWT signing |
| `NEXTAUTH_URL` | ✅ | Frontend URL (e.g. `https://desain.nugrohopramono.my.id`) |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL (e.g. `https://desain.nugrohopramono.my.id/api`) |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `FAL_KEY` | ✅ | Fal.ai API key |
| `S3_ENDPOINT` | ✅ | S3-compatible storage endpoint |
| `S3_BUCKET` | ✅ | Storage bucket name |
| `S3_ACCESS_KEY` | ✅ | Storage access key |
| `S3_SECRET_KEY` | ✅ | Storage secret key |
| `S3_PUBLIC_URL` | ✅ | Public URL for stored files |
| `SENTRY_DSN` | ❌ | Sentry DSN (optional) |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ | Frontend Sentry DSN (optional) |
| `NEXT_PUBLIC_POSTHOG_KEY` | ❌ | PostHog project key (optional) |
| `NEXT_PUBLIC_POSTHOG_HOST` | ❌ | PostHog host (optional) |

---

## 📡 API Reference

Base URL: `https://desain.nugrohopramono.my.id` (production) or `http://localhost:8000` (local)

### Auth
All endpoints except `/health`, `/docs`, and `/api/templates` require authentication via `X-User-Email` header (dev mode).

### Endpoints

| Method | Endpoint | Request | Response | Description | Auth Req |
|--------|----------|---------|----------|-------------|----------|
| `GET` | `/health` | None | JSON `{"status": "ok"}` | Health check | No |
| `GET` | `/docs` | None | HTML | Swagger UI documentation | No |
| **Designs** | | | | | |
| `POST` | `/api/designs/clarify` | JSON `{"text": "..."}` | JSON `BriefQuestionsResponse` | Generate AI clarification questions dari teks singkat | Yes |
| `POST` | `/api/designs/clarify-unified` | JSON `{"text": "..."}` | JSON `BriefQuestionsResponse` | Generate AI combined clarification questions for design and copywriting | Yes |
| `POST` | `/api/designs/parse` | JSON `ParseRequest` | JSON `ParsedTextElements` | Parse teks + jawaban interview → prompt & layout JSON | Yes |
| `POST` | `/api/designs/modify-prompt` | JSON `ModifyPromptRequest` | JSON `ModifyPromptResponse` | Modifikasi prompt via instruksi bahasa Indonesia | Yes |
| `POST` | `/api/designs/magic-text` | JSON `MagicTextRequest` | JSON `MagicTextResponse` | Generates a layout for text overlaid on a specific image | Yes |
| `POST` | `/api/designs/generate-title` | JSON `{"prompt": "..."}` | JSON `GenerateTitleResponse` | Generate short, catchy project title | Yes |
| `POST` | `/api/designs/upload` | Multipart form data (file) | JSON `{"url": "..."}` | Upload gambar referensi | Yes |
| `POST` | `/api/designs/remove-background` | Multipart form data (file) | Image file | Hapus background foto via rembg | Yes |
| `POST` | `/api/designs/clarify-copywriting` | JSON `{"text": "..."}` | JSON `BriefQuestionsResponse` | Generate pertanyaan klarifikasi untuk copywriting | Yes |
| `POST` | `/api/designs/generate-copywriting` | JSON `CopywritingRequest` | JSON `CopywritingResponse` | Generate 3 variasi teks promosi (FOMO/Benefit/Social Proof) | Yes |
| `POST` | `/api/designs/generate` | JSON `GenerateDesignRequest` | JSON `{"job_id": "..."}` | Generate full design/gambar (credit + rate-limited) | Yes |
| `GET` | `/api/designs/my-generations` | None | JSON `List[dict]` | Riwayat generasi user | Yes |
| `GET` | `/api/designs/jobs/{job_id}` | None | JSON `{"status": "..."}` | Poll job status | Yes |
| **AI Tools** | | | | | |
| `POST` | `/api/ai-tools/background-swap` | Multipart form data | JSON `{"image_url": "..."}` | Swap background of an image using Fal.ai | Yes |
| `POST` | `/api/ai-tools/upscale` | JSON `UpscaleRequest` | JSON `{"image_url": "..."}` | Upscale an image using Fal.ai | Yes |
| `POST` | `/api/ai-tools/text-banner` | JSON `TextBannerRequest` | JSON `{"image_url": "..."}` | Generate a decorative text banner | Yes |
| `POST` | `/api/ai-tools/retouch` | Multipart form data | JSON `{"image_url": "..."}` | Retouch an image (auto-enhance or remove blemishes) | Yes |
| `POST` | `/api/ai-tools/id-photo` | Multipart form data | JSON `{"image_url": "..."}` | Generate print-ready ID photo (pasfoto) | Yes |
| `POST` | `/api/ai-tools/magic-eraser` | JSON `InpaintRequest` | JSON `{"image_url": "..."}` | Remove objects using inpainting | Yes |
| `POST` | `/api/ai-tools/generative-expand`| JSON `OutpaintRequest` | JSON `{"image_url": "..."}` | Expand image boundaries using outpainting | Yes |
| `POST` | `/api/ai-tools/watermark` | Multipart form data | JSON `{"image_url": "..."}` | Apply a watermark to an image | Yes |
| `POST` | `/api/ai-tools/product-scene` | Multipart form data | JSON `{"image_url": "..."}` | Generate a professional product scene | Yes |
| `POST` | `/api/ai-tools/batch` | Multipart form data | ZIP file | Process a batch of images | Yes |
| **Brand Kits** | | | | | |
| `POST` | `/api/brand-kits/extract` | Multipart form data | JSON `ColorExtractionResponse` | Upload logo/foto → ekstrak 5 warna via Gemini Vision | Yes |
| `POST` | `/api/brand-kits/` | JSON `BrandKitCreate` | JSON `BrandKitResponse` | Simpan Brand Kit ke DB | Yes |
| `GET` | `/api/brand-kits/` | None | JSON `List[BrandKitResponse]` | List semua Brand Kit | Yes |
| `GET` | `/api/brand-kits/active` | None | JSON `Optional[BrandKitResponse]` | Get profil Brand Kit yang sedang aktif | Yes |
| `PUT` | `/api/brand-kits/{id}` | JSON `BrandKitUpdate` | JSON `BrandKitResponse` | Update (termasuk Set Active) | Yes |
| `DELETE` | `/api/brand-kits/{id}` | None | Status 204 | Hapus Brand Kit | Yes |
| **Templates** | | | | | |
| `GET` | `/api/templates/` | None | JSON `List[dict]` | List all templates | No |
| `GET` | `/api/templates/{id}` | None | JSON `dict` | Get template details | No |
| **Projects** | | | | | |
| `GET` | `/api/projects/` | None | JSON `List[ProjectResponse]` | List user's projects | Yes |
| `POST` | `/api/projects/` | JSON `ProjectCreate` | JSON `ProjectResponse` | Create a new project | Yes |
| `GET` | `/api/projects/{id}` | None | JSON `ProjectResponse` | Get project details | Yes |
| `PUT` | `/api/projects/{id}` | JSON `ProjectUpdate` | JSON `ProjectResponse` | Update project | Yes |
| `DELETE` | `/api/projects/{id}` | None | Status 204 | Delete project | Yes |
| **History** | | | | | |
| `POST` | `/api/history/` | JSON `HistoryCreate` | JSON `HistoryResponse` | Save a project history state | Yes |
| `GET` | `/api/history/{project_id}` | None | JSON `List[HistoryResponse]` | Get edit history for a project | Yes |
| **Users** | | | | | |
| `GET` | `/api/users/me` | None | JSON `UserResponse` | Get current user profile + credits | Yes |
| `PUT` | `/api/users/me` | JSON `UserUpdate` | JSON `UserResponse` | Update current user profile | Yes |
| `DELETE` | `/api/users/me` | None | Status 204 | Delete current user | Yes |
| `GET` | `/api/users/me/credits/history` | None | JSON `CreditHistoryResponse` | Get user credit transaction history | Yes |
| `GET` | `/api/users/me/storage` | None | JSON `{"used": int, "quota": int, "percentage": float, "used_mb": float, "quota_mb": float}` | Get user storage usage and quota | Yes |
| **Auth** | | | | | |
| `POST` | `/api/auth/register` | JSON `RegisterRequest` | JSON `AuthResponse` | Register new account with email/password | No |
| `POST` | `/api/auth/login` | JSON `LoginRequest` | JSON `AuthResponse` | Authenticate and get JWT token pair | No |
| `POST` | `/api/auth/refresh` | JSON `RefreshTokenRequest` | JSON `AuthResponse` | Issue new access/refresh token pair | No |
| `POST` | `/api/auth/forgot-password` | JSON `{"email": "..."}` | JSON `{"message": "..."}` | Send password reset email (rate-limited) | No |
| `POST` | `/api/auth/reset-password` | JSON `{"token": "...", "new_password": "..."}` | JSON `{"message": "..."}` | Reset password using valid reset token | No |

> 💡 Full interactive API docs available at `http://localhost:8000/docs` when the server is running.

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

**Test Coverage:** 20 tests covering:
- LLM text parsing (5 tests)
- Image pipeline — resize, color extraction (8 tests)
- Template API — CRUD, seeding (7 tests)

### Frontend

```bash
cd frontend
npm run lint          # ESLint check
npx tsc --noEmit     # TypeScript type check
npm run build         # Production build verification
```

**Canvas Editor Keyboard Shortcuts:**

| Shortcut | Action |
|----------|--------|
| `⌫` Delete | Delete selected element |
| `⌘D` | Duplicate selected element |
| `⌘]` | Bring Forward |
| `⌘[` | Send Backward |
| `⌘⇧]` | Bring to Front |
| `⌘⇧[` | Send to Back |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |

### CI/CD Pipeline

GitHub Actions automatically runs on every push/PR to `main` using the unified `.github/workflows/cicd.yml` workflow.

**Stages:**
1. **Lint & Test**: ✅ Backend (`ruff`, `pytest tests/ -v`) & ✅ Frontend (`npm run build`, `npm run lint`)
2. **Build & Push**: Builds Docker images for the backend and frontend and pushes them to GitHub Container Registry (GHCR). (Runs only on Push to `main`).
3. **Deploy**: Triggers an SSH deployment to the production VPS if the Build & Push stage succeeds.
4. **Auto Tag Release**: Parses commit messages (Semantic Versioning) and automatically bumps the version and pushes a new git tag.

---

## 📁 Project Structure

```
design-studio/
├── .env.example                    # Environment template
├── .github/workflows/cicd.yml      # Unified CI/CD pipeline (Test, Build, Deploy, Auto-Tag)
├── docker-compose.yml              # All services (Postgres, Redis, Backend, Celery, Frontend)
│
├── backend/
│   ├── alembic/                    # Database migrations
│   ├── app/
│   │   ├── api/                    # FastAPI routers
│   │   │   ├── deps.py             # Auth dependency injection
│   │   │   ├── designs.py          # AI generation endpoints
│   │   │   ├── projects.py         # CRUD endpoints
│   │   │   ├── rate_limit.py       # Redis rate limiter
│   │   │   ├── templates.py        # Template endpoints
│   │   │   └── users.py            # User profile endpoint
│   │   ├── core/                   # Config, DB, security
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── services/               # Business logic
│   │   │   ├── image_service.py    # Resize, color extraction
│   │   │   ├── llm_service.py      # Gemini Flash integration
│   │   │   ├── preprocess.py       # Image preprocessing
│   │   │   └── storage_service.py  # S3/B2 uploads
│   │   ├── workers/                # Celery tasks
│   │   └── main.py                 # FastAPI app entry
│   ├── scripts/seed_templates.py   # Template seeder
│   ├── tests/                      # pytest test suite
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router pages
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── create/
│   │   │   │   ├── page.tsx        # AI generation page (5-step flow)
│   │   │   │   └── types.ts        # Shared types (BriefQuestion, dll)
│   │   │   ├── edit/[id]/page.tsx  # Canvas editor
│   │   │   ├── projects/page.tsx   # Project list
│   │   │   └── providers.tsx       # PostHog provider
│   │   ├── components/
│   │   │   ├── create/             # Komponen halaman Create
│   │   │   │   ├── DesignBriefInterview.tsx  # AI interview form
│   │   │   │   ├── CopywritingPanel.tsx     # AI Copywriting panel (Sprint 3)
│   │   │   │   ├── SidebarInputForm.tsx      # Form teks + referensi
│   │   │   │   ├── SidebarActionBar.tsx      # Tombol aksi sidebar
│   │   │   │   ├── VisualPromptEditor.tsx    # Prompt review editor
│   │   │   │   └── GenerationProgress.tsx   # Loading state
│   │   │   ├── editor/             # Canvas + Toolbar + StylePanel
│   │   │   ├── credits/            # CreditBadge
│   │   │   ├── onboarding/         # OnboardingTour
│   │   │   ├── providers/          # AuthProvider
│   │   │   └── ui/                 # shadcn/ui primitives
│   │   ├── lib/                    # API client, utils
│   │   └── store/                  # Zustand state management
│   ├── sentry.*.config.ts          # Sentry configs
│   └── next.config.ts              # Next.js + Sentry config
```

---

## 🚢 Deployment (VPS + Docker)

**Production URL:** https://desain.nugrohopramono.my.id

### Docker Services

| Service | Container | Host Port | Internal Port |
|---------|-----------|-----------|---------------|
| PostgreSQL 16 | `design-studio-postgres-1` | 5433 | 5432 |
| Redis 7 | `design-studio-redis-1` | 6380 | 6379 |
| Backend (FastAPI) | `design-studio-backend-1` | 8000 | 8000 |
| Celery Worker | `design-studio-celery-1` | — | — |
| Frontend (Next.js) | `design-studio-frontend-1` | 3000 | 3000 |

### Nginx Reverse Proxy

- Config: `/etc/nginx/sites-available/desain.nugrohopramono.my.id`
- SSL: Let's Encrypt (auto-renew via Certbot)
- Routes:
  - `/` → Frontend (port 3000)
  - `/api/*` → Backend (port 8000)
  - `/docs` → Swagger UI (port 8000)
  - HTTP → HTTPS redirect

### Google OAuth Setup

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials):

1. **Authorized JavaScript Origins:**
   ```
   https://desain.nugrohopramono.my.id
   ```

2. **Authorized Redirect URIs:**
   ```
   https://desain.nugrohopramono.my.id/api/auth/callback/google
   ```

3. **OAuth Consent Screen → Authorized Domains:**
   ```
   nugrohopramono.my.id
   ```

### Common Commands

```bash
# Rebuild and restart all services
docker compose up -d --build

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Run migrations
docker compose exec backend alembic upgrade head

# Restart a single service
docker compose restart backend

# Reload Nginx (after config change)
nginx -t && systemctl reload nginx
```

---

## 📄 License

This project is private and not yet licensed for public distribution.
