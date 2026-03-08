# 🎨 SmartDesign Studio

> **Desain Grafis Instan untuk UMKM** — Platform desain berbasis AI yang membantu pelaku UMKM membuat konten visual profesional dalam hitungan detik.

[![CI/CD](https://github.com/YOUR_USERNAME/design-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/design-studio/actions)

---

## ✨ Features

- **AI Text Parsing** — Tulis deskripsi bisnis, AI (Gemini Flash) otomatis menghasilkan headline, tagline, CTA, dan rekomendasi warna
- **AI Image Generation** — Generate background visual profesional via Fal.ai (SDXL/Flux)
- **Canvas Editor** — Editor drag-and-drop berbasis Konva.js dengan:
  - Text & image elements, resize, rotate, drag
  - Layer management: Bring Forward/Backward, Bring to Front/Back (+ keyboard shortcuts `⌘]` `⌘[` `⌘⇧]` `⌘⇧[`)
  - Duplicate element (button + `⌘D`)
  - Opacity slider per-element
  - Solid background color picker
  - Undo/Redo history
  - Delete element (`⌫`)
- **Template System** — 8+ template siap pakai yang bisa langsung diaplikasikan ke desain
- **Export Multi-Format** — Download hasil ke PNG, JPG, atau PDF dengan kualitas tinggi
- **Credit System** — 10 kredit gratis untuk generasi AI, dengan rate limiting (10 req/menit)
- **Responsive** — Optimized untuk desktop dan mobile
- **Onboarding Tour** — Panduan interaktif untuk pengguna baru
- **Monitoring** — Sentry (error tracking) + PostHog (product analytics)

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│         Next.js Frontend        │
│  (React 19, Konva.js, Zustand)  │
│       Port :3000                │
└──────────┬──────────────────────┘
           │ REST API
┌──────────▼──────────────────────┐
│       FastAPI Backend           │
│   (SQLAlchemy, Pydantic)        │
│       Port :8000                │
├─────────┬────────┬──────────────┤
│ Celery  │ Redis  │  PostgreSQL  │
│ Workers │ :6379  │  :5433       │
└─────────┴────────┴──────────────┘
           │
    ┌──────▼──────┐
    │  External   │
    │  Services   │
    ├─────────────┤
    │ Gemini API  │
    │ Fal.ai      │
    │ Backblaze   │
    │ Sentry      │
    │ PostHog     │
    └─────────────┘
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
| **CI/CD** | GitHub Actions → Vercel (frontend) + Railway (backend) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **Python** ≥ 3.9
- **Docker** & Docker Compose (for PostgreSQL + Redis)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/YOUR_USERNAME/design-studio.git
cd design-studio
cp .env.example .env   # Edit with your API keys
```

### 2. Start Infrastructure

```bash
docker compose up -d   # PostgreSQL :5433 + Redis :6379
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed templates (optional)
python scripts/seed_templates.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

### 4. Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev   # Opens at http://localhost:3000
```

### 5. Start Celery Worker (for AI generation)

```bash
cd backend
source venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info
```

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
| `NEXTAUTH_URL` | ✅ | Frontend URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL (e.g. `http://localhost:8000/api`) |
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

Base URL: `http://localhost:8000`

### Auth
All endpoints except `/health`, `/docs`, and `/api/templates` require authentication via `X-User-Email` header (dev mode).

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Swagger UI documentation |
| **Designs** | | |
| `POST` | `/api/designs/parse` | Parse text → structured design elements |
| `POST` | `/api/designs/generate` | Generate full design (credit + rate-limited) |
| `GET` | `/api/designs/jobs/{job_id}` | Poll job status |
| **Templates** | | |
| `GET` | `/api/templates/` | List all templates |
| `GET` | `/api/templates/{id}` | Get template details |
| **Projects** | | |
| `GET` | `/api/projects/` | List user's projects |
| `POST` | `/api/projects/` | Create a new project |
| `GET` | `/api/projects/{id}` | Get project details |
| `PUT` | `/api/projects/{id}` | Update project |
| `DELETE` | `/api/projects/{id}` | Delete project |
| **Users** | | |
| `GET` | `/api/users/me` | Get current user profile + credits |

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

### CI/CD

GitHub Actions automatically runs on every push/PR to `main`:
- ✅ Backend: `pytest tests/ -v`
- ✅ Frontend: `npm run build` (includes tsc)

---

## 📁 Project Structure

```
design-studio/
├── .env.example                    # Environment template
├── .github/workflows/ci.yml       # CI/CD pipeline
├── docker-compose.yml              # PostgreSQL + Redis
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
│   │   │   ├── create/page.tsx     # AI generation page
│   │   │   ├── edit/[id]/page.tsx  # Canvas editor
│   │   │   ├── projects/page.tsx   # Project list
│   │   │   └── providers.tsx       # PostHog provider
│   │   ├── components/
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

## 🚢 Deployment

### Frontend → Vercel

1. Connect GitHub repo to [Vercel](https://vercel.com)
2. Set root directory to `frontend`
3. Add environment variables: `NEXT_PUBLIC_API_URL`, `NEXTAUTH_*`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`
4. Deploy — zero config required

### Backend → Railway

1. Connect GitHub repo to [Railway](https://railway.app)
2. Set root directory to `backend`
3. Add PostgreSQL and Redis plugins
4. Set environment variables: `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, `GEMINI_API_KEY`, `FAL_KEY`, `S3_*`, `SENTRY_DSN`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

---

## 📄 License

This project is private and not yet licensed for public distribution.
