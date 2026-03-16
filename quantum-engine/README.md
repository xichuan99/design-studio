# ⚛️ Quantum Layout Engine

Standalone microservice untuk SmartDesign Studio yang mengoptimasi posisi elemen desain menggunakan **Quantum QAOA** (pyQPanda).

## Stack
- **Runtime**: Python 3.10
- **Framework**: FastAPI
- **Quantum SDK**: pyQPanda (Origin Quantum)
- **Solver**: QAOA via CPUQVM (simulator)

## Quick Start

```bash
# Build & run via Docker
docker build -t quantum-engine .
docker run -p 8001:8001 quantum-engine

# Atau via docker-compose (dari root project)
docker-compose up quantum-engine
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/quantum/optimize` | Optimasi layout |

### `POST /api/quantum/optimize`

**Request Body:**
```json
{
  "canvas_width": 1080,
  "canvas_height": 1080,
  "elements": [
    { "role": "headline", "width": 800, "height": 120, "pinned": false },
    { "role": "cta", "width": 400, "height": 60, "pinned": false }
  ],
  "strategy": "balanced",
  "num_variations": 1
}
```

**Response:**
```json
{
  "variations": [[
    { "role": "headline", "x": 140, "y": 270 },
    { "role": "cta", "x": 340, "y": 810 }
  ]],
  "energy_score": -2.34,
  "solver_time_ms": 85
}
```

## Testing

```bash
pip install pytest
pytest tests/
```

## Architecture

```
app/
├── main.py              # FastAPI endpoints
├── config.py            # Settings
├── schemas/layout.py    # Pydantic models
└── services/
    ├── qubo_builder.py  # Canvas → QUBO matrix
    └── optimizer.py     # QAOA solver (pyQPanda)
```
