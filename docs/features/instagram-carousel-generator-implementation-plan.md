---
goal: Deliver Instagram Carousel Generator (Path C) from prompt-to-export ZIP
version: 1.0
date_created: 2026-03-23
status: 'Planned'
tags: [feature, frontend, backend, ai, export]
---

# Implementation Plan: Instagram Carousel Generator

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

## Related docs

- [Feature Specification](./instagram-carousel-generator.md)
- [System Architecture](../architecture/system-architecture.md)
- [Design Generation Sequence](../architecture/design-generation-sequence.md)
- [Deployment Topology](../architecture/deployment-topology.md)

## 1. Requirements & Constraints

- **REQ-001**: User can generate 5–10 carousel slides from one prompt with default 7-slide narrative arc.
- **REQ-002**: Preview must render in Instagram frame at fixed 4:5 viewport (420×525) with swipe/drag navigation.
- **REQ-003**: Export must produce 1080×1350 PNG per slide and downloadable ZIP.
- **REQ-004**: Output must preserve brand tokens derived from one primary color and selected tone/font profile.
- **REQ-005**: User can regenerate a specific slide without regenerating all slides.
- **SEC-001**: Endpoints must require authenticated user context and server-side validation.
- **SEC-002**: Input payload must be validated (topic, color format, slide count bounds).
- **SEC-003**: Export jobs must avoid arbitrary HTML/script injection from user text.
- **CON-001**: Do not break existing `/create` single-design flow.
- **CON-002**: Initial release should ship MVP first (generate + preview + export), then iterative enhancements.
- **CON-003**: Follow existing stack (Next.js App Router, FastAPI, Celery, Playwright, object storage).

## 2. Scope & Phasing

### MVP Scope (Release 1)

- New `Carousel Instagram` entry on `/create`
- Generate structured slide JSON from topic + brand inputs
- Render preview in IG frame
- Export all slides to ZIP (1080×1350)
- Regenerate one selected slide

### Post-MVP Scope (Release 2+)

- Advanced per-slide layout variants
- Batch brand profile presets
- Collaboration/review workflow
- Scheduled posting integration

## 3. Implementation Steps

### Phase 1: Backend Foundation (API + Data Contracts)

- GOAL-001: Provide stable API contracts and generation pipeline for carousel content.

| Task | Description | File(s) | Completed |
|------|-------------|---------|-----------|
| TASK-001 | Add Pydantic schemas for generate/regenerate/export requests and responses. | `backend/app/schemas/carousel.py` | |
| TASK-002 | Add router with endpoints: `POST /api/carousel/generate`, `POST /api/carousel/regenerate-slide`, `POST /api/carousel/export`. | `backend/app/api/carousel.py` | |
| TASK-003 | Register carousel router in app startup. | `backend/app/main.py` | |
| TASK-004 | Add service to build narrative arc (Hero → CTA), with fallback when model confidence low. | `backend/app/services/carousel_generation_service.py` | |
| TASK-005 | Add utility for brand token derivation from primary color + tone/font style. | `backend/app/services/carousel_brand_tokens.py` | |
| TASK-006 | Add guardrails for slide count range (5–10), hex color format, and payload sanitization. | `backend/app/schemas/carousel.py`, `backend/app/services/carousel_generation_service.py` | |

### Phase 2: Frontend Generator UX

- GOAL-002: Enable prompt-to-preview flow on `/create` without affecting existing flows.

| Task | Description | File(s) | Completed |
|------|-------------|---------|-----------|
| TASK-007 | Add `Carousel Instagram` entry card on `/create`. | `frontend/src/app/create/page.tsx` | |
| TASK-008 | Create `ChatToCarousel` input/form (topic, brand name, handle, primary color, tone/font, slide count). | `frontend/src/components/carousel/CarouselGeneratorForm.tsx` | |
| TASK-009 | Add API client methods for carousel generate/regenerate/export. | `frontend/src/lib/api/carouselApi.ts` | |
| TASK-010 | Create preview state/store for slides and active index. | `frontend/src/store/carouselStore.ts` | |
| TASK-011 | Build IG frame preview with swipe/drag + dot indicators and per-slide navigation. | `frontend/src/components/carousel/InstagramCarouselPreview.tsx` | |
| TASK-012 | Add per-slide editor panel and regenerate-single-slide action. | `frontend/src/components/carousel/CarouselSlideEditor.tsx` | |

### Phase 3: Export Pipeline (Playwright Rendering)

- GOAL-003: Export deterministic PNG outputs matching preview layout.

| Task | Description | File(s) | Completed |
|------|-------------|---------|-----------|
| TASK-013 | Add render template generator for slide HTML/CSS with strict sanitization. | `backend/app/services/carousel_render_template.py` | |
| TASK-014 | Add Playwright export worker to render 420×525 viewport at `device_scale_factor = 1080/420`. | `backend/app/workers/carousel_export_worker.py` | |
| TASK-015 | Capture each slide to PNG and package ZIP in storage. | `backend/app/services/carousel_export_service.py` | |
| TASK-016 | Return download URL and metadata to frontend export action. | `backend/app/api/carousel.py`, `frontend/src/lib/api/carouselApi.ts` | |
| TASK-017 | Add timeout/retry strategy for font loading and screenshot capture failures. | `backend/app/services/carousel_export_service.py` | |

### Phase 4: Reliability, QA, and Rollout

- GOAL-004: Ship safely with observable behavior and regression protection.

| Task | Description | File(s) | Completed |
|------|-------------|---------|-----------|
| TASK-018 | Add structured logs and request IDs around generation and export steps. | `backend/app/api/carousel.py`, `backend/app/services/*` | |
| TASK-019 | Add feature flag for phased UI rollout. | `frontend/src/app/create/page.tsx`, `frontend/src/lib/config.ts` | |
| TASK-020 | Add fallback UX for export failure with retry option. | `frontend/src/components/carousel/*` | |
| TASK-021 | Add docs update in feature spec with endpoint contracts and known limits. | `docs/features/instagram-carousel-generator.md` | |

## 4. API Design (Target)

### `POST /api/carousel/generate`

**Request**

```json
{
  "topic": "5 Tips UX Design untuk Startup",
  "brand_name": "DesignCo",
  "ig_handle": "@designco.id",
  "primary_color": "#6C5CE7",
  "font_style": "modern",
  "tone": "professional",
  "logo_type": "initial",
  "num_slides": 7
}
```

**Response**

```json
{
  "carousel_id": "car_abc123",
  "brand_tokens": {
    "primary": "#6C5CE7",
    "light": "#A29BFE",
    "dark": "#4834D4",
    "light_bg": "#F8F7FF",
    "dark_bg": "#0F0E2A"
  },
  "slides": [
    {
      "index": 1,
      "type": "hero",
      "headline": "...",
      "body": "...",
      "cta": null
    }
  ]
}
```

### `POST /api/carousel/regenerate-slide`

- Input: `carousel_id`, `slide_index`, optional `instruction`
- Output: regenerated slide content preserving shared brand tokens

### `POST /api/carousel/export`

- Input: `carousel_id`, optional export format options
- Output: `zip_url`, `slides_count`, `resolution`

## 5. Data Model Strategy

### MVP (no permanent DB table)

- Keep carousel draft state in frontend memory + optional temporary cache key in backend.
- Export pipeline consumes current slide payload directly.

### Optional Phase-2 persistence

| Table | Purpose |
|---|---|
| `carousel_projects` | Save draft carousel metadata and ownership |
| `carousel_slides` | Store slide JSON and version history |
| `carousel_exports` | Export artifact metadata and status |

Reasoning: MVP can ship faster without schema migration; persistence can be added after product validation.

## 6. Frontend Components (Planned)

- `CarouselGeneratorForm`
- `InstagramCarouselPreview`
- `CarouselSlide`
- `CarouselSlideEditor`
- `CarouselExportButton`
- `CarouselProgressIndicator`

All components should use existing design system primitives (`components/ui`) and existing token/theme strategy.

## 7. Testing Plan

| Test | Type | File |
|------|------|------|
| TEST-001 | pytest API | `backend/tests/test_carousel_api.py` |
| TEST-002 | pytest service | `backend/tests/test_carousel_generation_service.py` |
| TEST-003 | pytest export | `backend/tests/test_carousel_export_service.py` |
| TEST-004 | Playwright E2E | `frontend/tests/e2e/carousel-generate.spec.ts` |
| TEST-005 | Playwright E2E | `frontend/tests/e2e/carousel-export.spec.ts` |
| TEST-006 | Frontend unit | `frontend/src/components/carousel/*.test.tsx` |

### Acceptance Criteria

- User can generate 7-slide carousel from `/create` with valid preview.
- Regenerate slide updates only selected slide.
- Export returns ZIP with correct slide count and 1080×1350 dimensions.
- Existing single-design workflow remains unaffected.
- API rejects invalid inputs with clear validation messages.

## 8. Risks & Mitigations

- **RISK-001**: Model output structure inconsistent across languages.  
  **Mitigation**: strict schema normalization + fallback template fill.
- **RISK-002**: Playwright export unstable in production runtime.  
  **Mitigation**: warm-up, retry, deterministic timeout, font preload.
- **RISK-003**: User text injects malformed HTML/styles.  
  **Mitigation**: escape and sanitize all text payloads before render.
- **RISK-004**: Export latency high for 10 slides.  
  **Mitigation**: async worker + progress polling + capped concurrency.

## 9. Dependencies

- **DEP-001**: Gemini API access for narrative generation
- **DEP-002**: Playwright runtime available in backend worker environment
- **DEP-003**: Object storage for ZIP output delivery
- **DEP-004**: Existing auth dependency (`get_current_user`) and request tracing middleware

## 10. Delivery Recommendation

### Sprint A (3–4 days)

- Complete Phase 1
- Skeleton Phase 2 form + API integration
- API tests for generate/regenerate validation

### Sprint B (3–4 days)

- Complete preview UX and per-slide editing (Phase 2)
- Complete export pipeline (Phase 3)
- Add E2E coverage for generate + export

### Sprint C (1–2 days)

- Reliability hardening, feature flag rollout, docs update (Phase 4)

## 11. Definition of Done

Feature dianggap selesai saat:

- Carousel can be generated, previewed, edited per slide, and exported as ZIP.
- Output dimensions and slide order match specification.
- API, service, and E2E tests pass.
- Existing create/design flow remains stable after rollout.
