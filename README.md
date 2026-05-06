# 🎨 SmartDesign Studio

> **Desain Grafis Instan untuk UMKM** — Platform desain berbasis AI yang membantu pelaku UMKM membuat konten visual profesional dalam hitungan detik.

[![CI/CD](https://github.com/clarinovist/design-studio/actions/workflows/cicd.yml/badge.svg)](https://github.com/clarinovist/design-studio/actions)

---

## ✨ Features

- **AI Design Brief Interview** — Sebelum generate, AI mengajukan 3–4 pertanyaan klarifikasi (mood, warna, objek utama) sehingga prompt yang dihasilkan jauh lebih akurat
- **5-Step Create Flow** — Flow UI intuitif: 1) Input Teks, 2) **AI Interview** (pilihan ganda/teks), 3) Visual Prompt Review, 4) Generating, 5) Split-view Preview & Editor
- **AI Text Parsing & Copy Orchestration** — Backend menyiapkan headline, CTA, prompt visual, dan struktur output berbasis LLM sebelum hasil gambar dibuat
- **AI Image Generation** — Generate visual promosi dari brief teks dengan pipeline backend async dan integrasi AI image tooling terpisah
- **AI Photo Tools (Stand Alone)** — Hapus background foto produk, integrasikan ke latar profesional baru, Retouch & hapus noda/objek, Expand (Outpaint), Watermark, ID Photo, Batch Processing, serta Fitur Image Upscaler untuk menjernihkan & memperbesar foto hingga 4x resolusi. Dilengkapi fitur *Continue to Editor* untuk lanjut mengedit di Canvas utama.
- **AI Background Removal** — Hapus latar belakang foto produk secara instan menggunakan model U<sup>2</sup>-Net (rembg)
- **Brand Kit** — Buat brand kit dari brief, file, atau URL website; simpan beberapa profil brand, aktifkan yang dipakai, lalu injeksikan konteks brand ke flow create/copywriting
- **AI Copywriting / Headline Generator** — Generate 3 variasi teks promosi (FOMO, Benefit, Social Proof) dari deskripsi produk. Dilengkapi mini-interview klarifikasi, pilihan tone (Persuasif/Kasual/Profesional/Lucu), integrasi Brand Kit, dan re-generate.
- **Projects, Folders, and History** — Simpan hasil ke project, kelompokkan dalam folder, dan lacak snapshot riwayat edit/generasi.
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
- **Credit System** — Bonus awal 100 kredit dengan biaya per tool/generation dan rate limiting per user untuk endpoint berat
- **Responsive** — Optimized untuk desktop dan mobile
- **Onboarding Tour** — Panduan interaktif untuk pengguna baru
- **Observability** — Structured logging + request ID di backend, health endpoint ganda (`/health` dan `/api/health`), serta PostHog frontend yang aktif bila env tersedia

---

## 📌 Current Status

- **Live in repo sekarang**: create flow intent-first, preview → editor handoff, project/folder/history management, brand kit page, dan standalone AI photo tools utama.
- **Sudah tervalidasi**: lint frontend, build frontend, serta batch Playwright Chromium untuk flow inti dan 13 spec E2E baru/per-tool.
- **Masih planned / parsial**: Instagram Carousel Generator (Path C), reintroduksi Sentry, dan penyempurnaan marketplace/community template workflow.
- **PRD mapping + backlog prioritas**: lihat `docs/business/prd-gap-backlog-2026-04.md`.

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
| **AI/ML** | Google Gemini Flash (text), Fal.ai GPT Image 2 & Flux (image), scikit-learn (color extraction) |
| **Storage** | Backblaze B2 (S3-compatible) |
| **Auth** | NextAuth.js + Google OAuth |
| **Monitoring** | Structured logging, Request ID middleware, optional PostHog |
| **Infra** | Docker Compose, Nginx (reverse proxy + SSL), Let's Encrypt |
| **CI/CD** | GitHub Actions (Unified Lint, Build, Deploy, Release Please) |

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

This starts **6 containers**: PostgreSQL, Redis, Backend API, Celery Worker, Quantum Engine, and Frontend.

Untuk development yang lebih ringan, workflow lokal yang paling umum adalah:

```bash
docker compose up -d postgres redis
```

Lalu jalankan backend dan frontend dari folder masing-masing dengan environment lokal Anda.

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
| `NEXT_PUBLIC_POSTHOG_KEY` | ❌ | PostHog project key (optional) |
| `NEXT_PUBLIC_POSTHOG_HOST` | ❌ | PostHog host (optional) |

---

## 📡 API Reference

Base URL: `https://desain.nugrohopramono.my.id` (production) or `http://localhost:8000` (local)

### Auth
Frontend menggunakan NextAuth untuk session management. Backend mengekspos endpoint register/login/refresh/reset password dan memproteksi endpoint utama melalui dependency auth + rate limiting.

### Route Groups

- `GET /health` dan `GET /api/health` untuk health check aplikasi + koneksi database.
- `POST /api/auth/*` untuk register, login, refresh token, forgot password, dan reset password.
- `POST /api/designs/*` untuk clarify, parse, generate, upload media, copywriting, dan polling job hasil generasi.
- `POST /api/tools/*` untuk AI photo tools seperti background swap, retouch, magic eraser, generative expand, watermark, ID photo, product scene, upscale, batch process, jobs, dan result gallery.
- `GET|POST|PUT|DELETE /api/projects/*`, `/api/folders/*`, dan `/api/history/*` untuk project management, foldering, dan snapshot history.
- `GET|POST|PUT|DELETE /api/brand-kits/*` untuk ekstraksi warna, manajemen brand kit, dan brand context.
- `GET /api/templates/*` dan route marketplace terkait untuk template browsing, submission, dan listing template komunitas yang sudah dipublikasikan.
- `GET|PUT|DELETE /api/users/me*` untuk profil pengguna, credit history, dan storage usage.

Untuk daftar endpoint yang paling akurat, gunakan Swagger/OpenAPI dari backend yang sedang berjalan.

> 💡 Full interactive API docs available at `http://localhost:8000/docs` when the server is running.

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
source .venv310/bin/activate   # atau aktifkan virtualenv backend Anda sendiri
pytest tests/ -v
```

Backend juga diuji di CI bersama linting Ruff dan test suite quantum-engine.

### Frontend

```bash
cd frontend
npm run lint          # ESLint check
npx tsc --noEmit     # TypeScript type check
npm run build         # Production build verification
npm run test:e2e      # Playwright E2E
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
1. **Backend Test & Lint**: `ruff`, `pytest`, migrasi Alembic, dan seed template.
2. **Frontend Lint & Build**: `npm run lint` dan `npm run build`.
3. **Quantum Test**: test suite untuk service quantum-engine.
4. **Build & Push Images**: backend, frontend, dan quantum-engine ke GHCR pada push ke `main`.
5. **Deploy**: deploy ke VPS via SSH, pull image GHCR, `docker compose up -d`, lalu jalankan migrasi.

---

## 📁 Project Structure

```
design-studio/
├── .env.example                    # Environment template
├── .github/workflows/cicd.yml      # Unified CI/CD pipeline (Test, Build, Deploy, Release Please)
├── docker-compose.yml              # Local stack (Postgres, Redis, Backend, Celery, Quantum, Frontend)
│
├── backend/
│   ├── alembic/                    # Database migrations
│   ├── app/
│   │   ├── api/                    # FastAPI routers
│   │   │   ├── auth.py             # Auth endpoints
│   │   │   ├── designs.py          # Design + copywriting orchestration
│   │   │   ├── ai_tools.py         # AI tools aggregator
│   │   │   ├── projects.py         # Project CRUD
│   │   │   ├── folders.py          # Folder management
│   │   │   ├── history.py          # Design history snapshots
│   │   │   ├── brand_kits.py       # Brand kit management
│   │   │   └── rate_limit.py       # Redis rate limiting
│   │   ├── core/                   # Config, DB, security
│   │   ├── models/                 # SQLAlchemy models
│   │   ├── schemas/                # Pydantic schemas
│   │   ├── services/               # Business logic
│   │   ├── workers/                # Celery workers and async jobs
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
│   │   │   │   └── page.tsx        # AI generation page (5-step flow)
│   │   │   ├── edit/[projectId]/page.tsx  # Canvas editor
│   │   │   ├── projects/page.tsx   # Project list
│   │   │   ├── tools/              # Standalone AI tools pages
│   │   │   └── api/auth/[...nextauth]/route.ts  # NextAuth route
│   │   ├── components/
│   │   │   ├── create/             # Create flow components
│   │   │   ├── editor/             # Canvas + Toolbar + panels
│   │   │   ├── landing/            # Landing page sections
│   │   │   ├── onboarding/         # Guided tours
│   │   │   ├── providers/          # AuthProvider
│   │   │   └── ui/                 # shadcn/ui primitives
│   │   ├── lib/                    # API client, utils
│   │   ├── proxy.ts                # Route protection via NextAuth middleware proxy
│   │   └── store/                  # Zustand state management
│   ├── tests/e2e/                  # Playwright end-to-end tests
│   └── next.config.ts              # Next.js config
│
├── quantum-engine/
│   ├── app/                        # Separate FastAPI service
│   └── tests/                      # Quantum engine tests
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
| Quantum Engine | `design-studio-quantum-engine-1` | 8001 | 8001 |
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
