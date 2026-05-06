# SmartDesign Studio — Marketing-Product Alignment Plan

*Created: 2026-05-05 | Strategic pivot execution roadmap*
*Based on: Audit Gap Analysis — Dokumen Marketing vs Realita Produk*

---

## Executive Summary

Backend SmartDesign Studio v1.25.0 sudah lebih maju dari klaim marketing: multi-model AI orchestration, GPT Image 2 integration, ultra quality tiering — semua sudah ada di kode. Tapi **missing layer-nya adalah UI/UX** yang menghubungkan kemampuan backend ke user.

Dokumen ini adalah jembatan: dari temuan audit gap → rencana implementasi konkret → eksekusi.

---

## 1. Strategic Context

**Pivot (May 2026):** Dari "Alternatif Canva" ke "OpenRouter untuk desain UMKM" — agregasi model AI terbaik + guided workflow + editor + brand kit + format presisi marketplace Indonesia.

**Key messaging:** Counter langsung "Kenapa tidak pakai ChatGPT/GPT Image 2?"

**Apa yang sudah berfungsi di backend (tidak perlu dibangun ulang):**
- 20+ model AI constants (`backend/app/core/ai_models.py`)
- GPT Image 2 via fal.ai (`FAL_IMAGE_GPT2_TEXT_TO_IMAGE`)
- Ultra quality credit pricing (`credit_costs.py`: 80 credits untuk ultra)
- Celery async job processing
- Credit system dengan tiered costs (5/10/20/40/80)
- All AI photo tools (background removal, retouch, upscale, outpainting, etc.)
- Brand kit auto-extraction
- 13 Playwright E2E specs
- CI/CD pipeline (GitHub Actions)

**Apa yang perlu dibangun sekarang (frontend + minor backend):**
1. Waitlist mechanism — capture demand sebelum launch
2. Landing page rewrite — messaging baru
3. Model selector UI — hubungkan kemampuan backend
4. Tiered pricing display — tampilkan Ultra Quality tier
5. Model comparison view — penuhi janji marketing

---

## 2. Implementation Plan — Phase by Phase

### PHASE 0: Landing Page + Waitlist (P0 — Minggu Ini)

**Goal:** Landing page dengan messaging baru + waitlist mechanism yang berfungsi.

| # | Task | Lokasi | Estimasi | Priority |
|---|------|--------|----------|:---:|
| 1 | **Rewrite Hero Section** — headline baru: "AI Terbaik Minggu Ini, Minggu Depan, dan Seterusnya. Kamu Tinggal Cerita." | `frontend/src/app/page.tsx` baris 99-105 | 30 menit | P0 |
| 2 | **Rewrite Section 2** — "Kenapa AI Chatbot Tidak Cukup?" dengan tabel comparison | `page.tsx` — ganti section "Realita di Lapangan" (baris 132-170) | 45 menit | P0 |
| 3 | **Rewrite FAQ** — tambah 2 pertanyaan: "Kenapa gak langsung ChatGPT/Gemini?" dan "Apa bedanya model AI yang dipakai?" | `frontend/src/components/landing/FAQSection.tsx` | 30 menit | P0 |
| 4 | **Rewrite CTA buttons** — dari "Masuk ke Studio" ke "Dapatkan Akses Batch Pertama — Gratis 30 Hari" (waitlist phase) | `page.tsx` — semua CTA buttons | 15 menit | P0 |
| 5 | **Build Waitlist Backend** — endpoint `POST /api/waitlist` + database table `waitlist_signups` | `backend/`: new migration + `api/waitlist.py` + `models/waitlist.py` | 2 jam | P0 |
| 6 | **Build Waitlist Frontend** — upgrade newsletter form di footer jadi waitlist form + lead magnet auto-delivery via email | `page.tsx` footer section | 1 jam | P0 |
| 7 | **Add Waitlist Counter** — tampilkan "X+ UMKM sudah mengantri" di landing page (dynamic dari API) | `page.tsx` social proof section | 45 menit | P1 |
| 8 | **Meta Tags Update** — title + description baru sesuai `landing-page-copy.md` v2 | `page.tsx` — jsonLD + Next.js metadata | 15 menit | P1 |

**Milestone:** Landing page live dengan messaging baru. Waitlist berfungsi capture email + deliver lead magnet.

---

### PHASE 1: Model Selector + Pricing Alignment (P1 — Minggu Depan)

**Goal:** User bisa memilih model AI dan melihat perbedaan tier pricing.

| # | Task | Lokasi | Estimasi | Priority |
|---|------|--------|----------|:---:|
| 1 | **Build Model Selector Backend API** — `GET /api/models` — return list model yang available per user tier, dengan label & deskripsi | `backend/app/api/models.py` | 1 jam | P1 |
| 2 | **Model Selector Config** — definisikan model-grouping: Basic (Flux Schnell, Gemini), Premium (Flux Pro, Bria Fibo), Ultra (GPT Image 2) | `backend/app/core/model_tiers.py` (new) | 30 menit | P1 |
| 3 | **Build Model Selector UI Component** — dropdown/pills pilih model di create flow, step antara AI Interview dan Generate | `frontend/src/components/create/ModelSelector.tsx` (new) | 2 jam | P1 |
| 4 | **Integrate Model Selector ke Create Flow** — sisipkan di 5-step flow | `frontend/src/app/create/page.tsx` | 1 jam | P1 |
| 5 | **Update PricingSection** — tambah tier "Ultra Quality (GPT Image 2)" dengan badge premium | `frontend/src/components/landing/PricingSection.tsx` | 1 jam | P1 |
| 6 | **Update Credit Display** — di halaman tools, tampilkan perbedaan credit cost per model tier | `frontend/src/app/tools/*` — tambah tooltip/badge | 1 jam | P2 |
| 7 | **Update Brand Kit Logo Gen** — `FAL_BRAND_LOGO` saat ini pakai `fal-ai/flux/dev`, bisa expose opsi ultra | `backend/app/core/ai_models.py` + brand kit frontend | 30 menit | P2 |

**Milestone:** User bisa pilih model AI. Pricing mencerminkan tier lengkap (Basic/Pro/Ultra).

---

### PHASE 2: Model Comparison + Social Proof (P2 — 2 Minggu Lagi)

**Goal:** Penuhi janji marketing tentang perbandingan model + kumpulkan social proof.

| # | Task | Lokasi | Estimasi | Priority |
|---|------|--------|----------|:---:|
| 1 | **Build Model Comparison Page** — halaman `/compare-models` — user bisa generate 1 brief dengan 2-3 model berbeda, lihat hasil side-by-side | `frontend/src/app/compare-models/page.tsx` (new) + backend endpoint | 3 jam | P2 |
| 2 | **Build Comparison Sharing** — hasil perbandingan bisa dishare ke social media | `frontend/src/components/compare/ShareComparison.tsx` | 1 jam | P2 |
| 3 | **Integrasi PostHog Events** — track: waitlist signup, model selected, design generated, model comparison used | `frontend/src/lib/analytics.ts` | 1 jam | P2 |
| 4 | **Testimonial Collection Flow** — popup/email setelah user generate 5+ desain, minta testimonial | Backend: trigger logic. Frontend: testimonial form | 2 jam | P2 |
| 5 | **Dynamic Testimonial Display** — ganti testimonial dummy di landing page dengan data asli | `frontend/src/components/landing/TestimonialCarousel.tsx` | 1 jam | P3 |
| 6 | **Blog/SEO Page Setup** — halaman `/vs/gpt-image`, `/vs/canva`, `/vs/chatgpt` sebagai static pages Next.js | `frontend/src/app/vs/*/page.tsx` | 3 jam | P3 |

**Milestone:** Model comparison berfungsi. Testimonial asli mulai terkumpul.

---

### PHASE 3: Post-Launch Optimization (P3 — Setelah Launch)

| # | Task | Priority |
|---|------|:---:|
| 1 | A/B test landing page headlines | P3 |
| 2 | Referral program frontend integration | P3 |
| 3 | Instagram Carousel Generator completion (Path C) | P3 |
| 4 | Batch processing queue optimization | P3 |
| 5 | Marketplace API integration (Shopee/Tokopedia direct upload) | P4 |
| 6 | Model evaluation dashboard internal | P4 |

### PHASE 3B Operationalization (Launch Ops)

Eksekusi detail untuk experiment cadence, guardrail, incident, dan rollback dipisah ke dokumen operasional:

- `docs/marketing/phase-3b-launch-operations.md`

---

## 3. Technical Specifications

### 3.1 Waitlist Backend

**Database Migration:**
```sql
CREATE TABLE waitlist_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    source VARCHAR(50) DEFAULT 'landing_page',
    lead_magnet_delivered BOOLEAN DEFAULT FALSE,
    signed_up_at TIMESTAMP DEFAULT NOW(),
    converted_to_user BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMP NULL
);
```

**API Endpoint:**
```
POST /api/waitlist
  Body: { "email": "user@example.com", "source": "landing_page" }
  Response: { "id": "uuid", "position": 47, "total_waitlist": 47 }
  
GET /api/waitlist/count
  Response: { "total": 47 }
```

### 3.2 Model Selector Architecture

**Backend Config (`backend/app/core/model_tiers.py`):**
```python
MODEL_TIERS = {
    "basic": {
        "label": "Cepat & Murah",
        "description": "Untuk daily content. Hasil bagus, biaya rendah.",
        "credit_multiplier": 1.0,
        "models": ["fal-ai/flux/schnell", "google/gemini-2.5-flash"]
    },
    "pro": {
        "label": "Kualitas Premium",
        "description": "Untuk campaign penting. Detail lebih tinggi.",
        "credit_multiplier": 1.0,
        "models": ["fal-ai/flux-pro/v1.1", "bria/fibo-edit/edit"]
    },
    "ultra": {
        "label": "Ultra Quality (GPT Image 2)",
        "description": "Kualitas tertinggi. Hanya untuk 1-2 desain flagship per bulan.",
        "credit_multiplier": 2.0,
        "models": ["fal-ai/gpt-image-2"]
    }
}
```

**API Endpoint:**
```
GET /api/models
  Response: {
    "tiers": [
      {
        "id": "basic",
        "label": "Cepat & Murah",
        "models": [...]
      },
      ...
    ],
    "user_default_tier": "basic"
  }
```

### 3.3 Landing Page — Key Copy Changes

| Element | Current (Old) | New |
|---------|---------------|-----|
| Hero H1 | "Dari Brief Singkat ke Desain yang Siap Dipakai" | "AI Terbaik Minggu Ini, Minggu Depan, dan Seterusnya. Kamu Tinggal Cerita — Kami yang Bikin Desainnya." |
| Hero H2 | "Untuk UMKM yang sering bingung mulai..." | "ChatGPT, Gemini, GPT Image 2 — semua bisa generate gambar keren. Tapi gambar ≠ desain siap upload. SmartDesign pakai model AI TERBAIK + guided interview + editor + brand kit." |
| Primary CTA | "Masuk ke Studio" | "Dapatkan Akses Batch Pertama — Gratis 30 Hari" |
| Realita Section | "AI Bisa Bikin Gambar..." | "Kenapa AI Chatbot Tidak Cukup?" — tabel comparison 4 baris |
| FAQ Q1 | "Apakah aplikasi ini gratis?" | Tambah Q: "Kenapa gak langsung pakai ChatGPT/GPT Image 2 aja?" |
| Footer Form | "Dapatkan Tips Konten" | "Amankan Akses Batch Pertama — Gratis 30 Hari + Bonus PDF" |

### 3.4 PricingSection — New Tiers

| Tier Saat Ini | Tambahan Baru |
|---------------|---------------|
| Starter (100 kr, Rp 15K) | + badge: "Model Basic (Flux Schnell)" |
| Pro (500 kr, Rp 50K) | + badge: "Model Basic + Pro (Flux Pro)" |
| Business (2000 kr, Rp 150K) | + badge: "Semua Model + Ultra (GPT Image 2)" |

---

## 4. Timeline

```
Week 1 (May 5-11) — PHASE 0
├── Day 1-2: Waitlist backend + frontend
├── Day 3-4: Landing page rewrite
└── Day 5: Testing + deploy

Week 2 (May 12-18) — PHASE 0 Complete + PHASE 1 Start
├── Day 1-2: Model selector backend
├── Day 3-4: Model selector UI + create flow integration
├── Day 5: PricingSection update

Week 3-4 (May 19 - Jun 1) — PHASE 1 Complete + PHASE 2
├── Model comparison page
├── PostHog events
└── Testimonial collection

June 2+ — PHASE 3 (post-launch optimization)
```

---

## 5. Dependencies & Constraints

| Dependency | Status | Impact on Timeline |
|------------|:---:|-----|
| Database migration (PostgreSQL available) | ✅ Ada (Docker) | Tidak blocking |
| Email service (Resend API key) | ❓ Perlu setup | Blocking waitlist email delivery |
| Domain (desain.nugrohopramono.my.id) | ✅ Live | Tidak blocking |
| SSL (Let's Encrypt) | ✅ Auto-renew | Tidak blocking |
| VPS deployment access | ✅ Docker Compose | Tidak blocking |
| Git repo (clarinovist/design-studio) | ✅ Ada | Tidak blocking |

---

## 6. Success Metrics

| Metric | Target (Week 2) | Target (Week 4) | Target (Month 3) |
|--------|:---:|:---:|:---:|
| Landing page deployed dengan messaging baru | ✅ | — | — |
| Waitlist signups | 50 | 200 | 500 |
| Lead magnet PDF downloads | 30 | 120 | 300 |
| Model selector live di create flow | — | ✅ | — |
| Model comparison page live | — | — | ✅ |
| Testimonial asli terkumpul | 0 | 5 | 20 |

---

## 7. Risk Register

| Risk | Probability | Mitigation |
|------|:---:|------|
| Waitlist form tidak terkirim email (Resend setup delay) | Medium | Fallback: simpan ke DB dulu, kirim email manual batch |
| Landing page rewrite breaking existing tests | Low | Run Playwright E2E setelah setiap deploy |
| Model selector bikin UX create flow terlalu panjang | Medium | Buat optional — default "Auto (Pilihkan Terbaik)", advanced user bisa expand |
| User tidak paham perbedaan model tiers | Medium | Tooltip + short description per tier. Jangan technical jargon. |
| GPT Image 2 cost tinggi bikin margin tipis | Low-Medium | Hanya available di Ultra tier (2x credit cost) |

---

## 8. Files Manifest — What Gets Changed

### Backend Files:
| File | Action |
|------|--------|
| `backend/app/core/model_tiers.py` | **NEW** — model tier definitions |
| `backend/app/api/waitlist.py` | **NEW** — waitlist endpoints |
| `backend/app/api/models.py` | **NEW** — model list endpoint |
| `backend/app/models/waitlist.py` | **NEW** — waitlist SQLAlchemy model |
| `backend/alembic/versions/xxx_waitlist_signups.py` | **NEW** — migration |

### Frontend Files:
| File | Action |
|------|--------|
| `frontend/src/app/page.tsx` | **REWRITE SECTIONS** — hero, content, CTA, footer form |
| `frontend/src/components/landing/FAQSection.tsx` | **APPEND** — 2 pertanyaan baru |
| `frontend/src/components/landing/PricingSection.tsx` | **UPDATE** — tier labels + ultra badge |
| `frontend/src/components/landing/TestimonialCarousel.tsx` | **UPDATE** — dynamic data source |
| `frontend/src/components/create/ModelSelector.tsx` | **NEW** |
| `frontend/src/app/create/page.tsx` | **UPDATE** — integrate ModelSelector |
| `frontend/src/app/compare-models/page.tsx` | **NEW** |
| `frontend/src/app/vs/gpt-image/page.tsx` | **NEW** |
| `frontend/src/app/vs/canva/page.tsx` | **NEW** |
| `frontend/src/app/vs/chatgpt/page.tsx` | **NEW** |
| `frontend/src/lib/analytics.ts` | **UPDATE** — waitlist + model events |

### Docs Files:
| File | Action |
|------|--------|
| `docs/marketing/product-alignment-plan.md` | **THIS FILE** |

---

*End of Plan. Ready for execution review.*
