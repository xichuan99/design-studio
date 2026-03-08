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

## Testing

```bash
pytest tests/ -v
```

## API Documentation

Interactive Swagger docs available at: `http://localhost:8000/docs`

## Project Structure

```
app/
├── api/            # Route handlers
│   ├── deps.py     # Auth + user dependency injection
│   ├── designs.py  # AI generation endpoints
│   ├── projects.py # Project CRUD
│   ├── rate_limit.py # Redis rate limiter
│   ├── templates.py  # Template endpoints
│   └── users.py    # User profile + credits
├── core/           # Config, database, security
├── models/         # SQLAlchemy ORM models
├── schemas/        # Pydantic request/response schemas
├── services/       # Business logic (LLM, image, storage)
├── workers/        # Celery async tasks
└── main.py         # FastAPI app entry point
```
