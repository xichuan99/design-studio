# SmartDesign Studio — Backend

FastAPI backend for the SmartDesign Studio AI graphic design platform.

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed templates (optional, requires running DB)
python scripts/seed_templates.py

# Start server
uvicorn app.main:app --reload --port 8000
```

## Infrastructure

Requires PostgreSQL and Redis. Start via Docker Compose from the project root:

```bash
docker compose up -d
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/designs/clarify` | Generate pertanyaan klarifikasi AI dari teks singkat |
| `POST` | `/api/designs/parse` | Parse teks + `clarification_answers` → prompt & layout JSON |
| `POST` | `/api/designs/generate` | Generate gambar (credit + rate-limited) |
| `POST` | `/api/designs/modify-prompt` | Modifikasi prompt via instruksi bahasa Indonesia |
| `GET`  | `/api/designs/jobs/{job_id}` | Poll job status |
| `GET`  | `/api/designs/my-generations` | Riwayat generasi user |
| `POST` | `/api/designs/upload` | Upload gambar referensi |
| `GET`  | `/api/templates/` | List semua template |
| `GET`  | `/api/projects/` | List project user |
| `GET`  | `/api/users/me` | Profil + kredit user |

## AI Model Routing Strategy

Each AI task is assigned to a specific provider and model to avoid overlap:

| Task | Provider | Model | Used By |
|------|----------|-------|---------|
| Text Parsing & Layout | **Gemini** | `gemini-2.5-flash` | `/clarify`, `/parse`, `/magic-text` |
| Copywriting Generation | **Gemini** | `gemini-2.5-flash` | `/generate-copywriting` |
| Main Image Generation | **Gemini** | `gemini-3.1-flash-image-preview` | `/generate` |
| Background Removal | **Fal.ai** | `fal-ai/birefnet` | `/remove-background`, `/tools/background-swap` |
| New BG Generation (Swap) | **Fal.ai** | `fal-ai/flux/dev` | `/tools/background-swap` |
| Image Upscaling | **Fal.ai** | `fal-ai/aura-sr` | `/tools/upscale` |

**Rule of thumb:** Gemini = 🧠 Otak (text, logic, image gen). Fal.ai = ✂️ Piksel (segmentasi, upscale).

### Environment Variables

- `GEMINI_API_KEY` — Used by `llm_service.py` and Gemini Imagen in `designs.py`.
- `FAL_KEY` — Used by `image_service.py`, `bg_removal_service.py`, and `upscale_service.py`.

If `GEMINI_API_KEY` is not set, AI endpoints return **mock data** for local development.

## AI Design Flow

```
POST /clarify  →  3-4 pertanyaan klarifikasi (Gemini)
POST /parse    →  Prompt visual + layout JSON (Gemini)
POST /generate →  Background image (Gemini Imagen / Nano Banana 2)
```

## Testing

```bash
pytest tests/ -v
```

## Project Structure

```
app/
├── api/
│   ├── ai_tools.py        # Standalone AI tools (/background-swap, /upscale)
│   ├── deps.py            # Auth + user dependency injection
│   ├── designs.py         # AI generation endpoints (/clarify, /parse, /generate)
│   ├── projects.py        # Project CRUD
│   ├── rate_limit.py      # Redis rate limiter
│   ├── templates.py       # Template endpoints
│   └── users.py           # User profile + credits
├── core/                  # Config, database, security
├── models/                # SQLAlchemy ORM models
├── schemas/
│   └── design.py          # Pydantic schemas
├── services/
│   ├── llm_service.py     # Gemini (text parsing, copywriting, layout)
│   ├── image_service.py   # Fal.ai Flux (background generation)
│   ├── bg_removal_service.py  # Fal.ai birefnet (background removal)
│   ├── upscale_service.py # Fal.ai aura-sr (image upscaling)
│   ├── preprocess.py      # Image preprocessing utilities
│   └── storage_service.py # S3 upload/download
├── workers/               # Celery async tasks
└── main.py                # FastAPI app entry point
```
