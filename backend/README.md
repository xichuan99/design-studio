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

## AI Design Flow

```
POST /clarify  →  3-4 pertanyaan klarifikasi dari Gemini
POST /parse    →  Prompt visual + layout JSON (dengan context jawaban)
POST /generate →  Background image generation (Fal.ai / Gemini Imagen)
```

Jika `GEMINI_API_KEY` tidak disetel, semua endpoint AI mengembalikan **mock data** sehingga aplikasi tetap bisa dijalankan untuk development.

## Testing

```bash
pytest tests/ -v
```

## Project Structure

```
app/
├── api/
│   ├── deps.py         # Auth + user dependency injection
│   ├── designs.py      # AI generation endpoints (/clarify, /parse, /generate, dll)
│   ├── projects.py     # Project CRUD
│   ├── rate_limit.py   # Redis rate limiter
│   ├── templates.py    # Template endpoints
│   └── users.py        # User profile + credits
├── core/               # Config, database, security
├── models/             # SQLAlchemy ORM models
├── schemas/
│   └── design.py       # Pydantic schemas (BriefQuestion, DesignGenerationRequest, dll)
├── services/
│   ├── llm_service.py  # Gemini Flash integration (clarify + parse + modify)
│   ├── image_service.py
│   ├── preprocess.py
│   └── storage_service.py
├── workers/            # Celery async tasks
└── main.py             # FastAPI app entry point
```
