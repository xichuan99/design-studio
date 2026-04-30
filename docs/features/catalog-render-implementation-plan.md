# Catalog Render End-to-End Implementation Plan

Tanggal: 2026-04-30  
Status: **COMPLETED — v1 shipped 2026-04-30**  
Owner: Backend + Frontend Team

## 1. Ringkasan

Flow katalog saat ini berhenti di tahap planning (struktur, style, mapping, copy, final plan). Dokumen ini memformalkan implementasi agar flow katalog benar-benar menghasilkan output akhir yang siap dipakai user.

Target hasil fase v1:

1. Render multipage berbasis final plan.
2. Hasil per halaman tersedia untuk preview gallery.
3. Unduhan ZIP berisi PNG tiap halaman.

Keputusan produk:

1. Output v1: ZIP berisi PNG per halaman.
2. Engine render: AI image generation per halaman.
3. UX delivery: tampilkan gallery dulu, lalu tombol download ZIP.

## 2. Tujuan dan KPI

### 2.1 Tujuan fungsional

1. User dengan goal catalog dapat menekan Generate dan mendapatkan hasil katalog multipage.
2. User dapat memantau progres render sampai selesai.
3. User dapat melihat semua halaman katalog sebelum mengunduh.

### 2.2 KPI teknis

1. Job success rate minimal 90% untuk request valid.
2. Median completion time untuk 5 halaman: <= 150 detik.
3. Error tanpa fallback per halaman: <= 5%.
4. Tidak ada regresi pada flow non-catalog.

## 3. Scope

### 3.1 In scope

1. Endpoint backend untuk start render katalog dan status render katalog.
2. Orkestrasi render per halaman dari final plan.
3. Penyimpanan hasil per halaman dan packaging ZIP.
4. Integrasi frontend preview untuk trigger render katalog.
5. Gallery hasil di preview dan tombol download ZIP.
6. Telemetry dan logging untuk observability.
7. Unit/integration test utama backend dan frontend.

### 3.2 Out of scope (fase ini)

1. Ekspor PDF multipage native.
2. Integrasi langsung ke editor multipage canvas internal.
3. Fine-grained template editor per halaman katalog.

## 4. Arsitektur Solusi

### 4.1 Alur tinggi

1. Interview flow menghasilkan `catalogFinalPlan` seperti saat ini.
2. Preview flow (goal catalog) memanggil endpoint start render katalog.
3. Backend membuat job render katalog dengan status `queued`.
4. Worker/service memproses halaman 1..N dan menghasilkan image per halaman.
5. Backend memperbarui progres dan daftar hasil halaman secara incremental.
6. Setelah semua halaman selesai, backend membuat ZIP lalu menyimpan `zip_url`.
7. Frontend polling status, menampilkan gallery saat `completed`, lalu user dapat download ZIP.

### 4.2 Prinsip desain

1. Planning flow existing tetap dipertahankan (minimal disruption).
2. Render flow katalog dipisahkan dari flow generate single-image.
3. Fallback per halaman wajib agar job total tetap bisa selesai.
4. API status dibuat stabil agar polling frontend sederhana dan robust.

## 5. API Contract (Proposed)

### 5.1 Start Render

Endpoint: `POST /api/catalog/render`

Request body:

```json
{
  "final_plan": {},
  "options": {
		"aspect_ratio": "1:1",
		"language": "id",
		"quality_mode": "standard",
		"reference_image_url": "https://..."
  }
}
```

Keterangan field:

1. `final_plan`: object hasil finalize-plan (wajib).
2. `options.aspect_ratio`: string, default `1:1`.
3. `options.language`: string, default `id`.
4. `options.quality_mode`: `draft | standard | high`, default `standard`.
5. `options.reference_image_url`: string opsional.

Response:

```json
{
  "job_id": "uuid",
  "status": "queued",
  "total_pages": 5,
  "created_at": "2026-04-30T10:00:00Z"
}
```

### 5.2 Get Render Status

Endpoint: `GET /api/catalog/render/{job_id}`

Response:

```json
{
  "job_id": "uuid",
  "status": "processing",
  "progress": {
		"completed_pages": 3,
		"total_pages": 5,
		"percent": 60
  },
  "pages": [
		{
			"page_number": 1,
			"status": "completed",
			"result_url": "https://.../page-01.png",
			"fallback_used": false,
			"error_message": null
		}
  ],
  "zip_url": null,
  "error_message": null
}
```

Status enum yang dipakai:

1. Job status: `queued | processing | completed | failed`.
2. Page status: `completed | failed | fallback`.

### 5.3 Error semantics

1. `400` untuk request invalid.
2. `401/403` mengikuti auth policy existing.
3. `404` jika `job_id` tidak ditemukan atau bukan milik user.
4. `500` untuk failure internal tanpa fallback total.

## 6. Data Model Strategy

> **Keputusan implementasi v1:** Menggunakan model `AiToolJob` existing dengan field `payload_json["_result_meta"]` untuk menyimpan progres per halaman. Tidak menambah tabel baru (pragmatic decision untuk ship cepat — model baru bisa dipertimbangkan di v2 jika ada kebutuhan query per-halaman yang kompleks).

Opsi:

1. Extend model jobs existing. ✅ **Diimplementasi**
2. Tambah model baru `catalog_render_jobs` dan `catalog_render_pages`. (ditunda ke v2)

### 6.1 Tabel usulan

`catalog_render_jobs`:

1. `id` (uuid)
2. `user_id`
3. `status`
4. `total_pages`
5. `completed_pages`
6. `input_plan_json`
7. `zip_url`
8. `error_message`
9. `created_at`
10. `completed_at`

`catalog_render_pages`:

1. `id` (uuid)
2. `job_id`
3. `page_number`
4. `status`
5. `prompt_used`
6. `result_url`
7. `fallback_used` (bool)
8. `error_message`
9. `created_at`
10. `updated_at`

## 7. Backend Implementation Plan

### Phase A - Contract and schema ✅ DONE

1. ✅ Tambah schema request/response baru di modul schema katalog (`app/schemas/catalog.py`):
   - `CatalogRenderOptions`, `CatalogRenderStartRequest`, `CatalogRenderStartResponse`
   - `CatalogRenderPageStatus`, `CatalogRenderProgress`, `CatalogRenderStatusResponse`
2. ✅ Validator bawaan Pydantic (field constraints + literal types).
3. ✅ Typed status payload per halaman dengan literal enum.

### Phase B - Router and orchestration ✅ DONE

1. ✅ Route `POST /api/catalog/render` di `app/api/catalog.py`.
2. ✅ Route `GET /api/catalog/render/{job_id}` di `app/api/catalog.py`.
3. ✅ Ownership check via `get_catalog_render_job_for_user`.
4. ✅ Credit charging: 1 credit/halaman, debit on start, refund on total failure.

### Phase C - Render service multipage ✅ DONE

1. ✅ Service layer `app/services/catalog_render_service.py`.
2. ✅ Worker `app/workers/ai_tool_jobs_catalog.py`.
3. ✅ `_build_page_visual_prompt()` compose prompt dari `type`, `layout`, `content.title`, `catalog_type`, `style`, `tone`.
4. ✅ AI image generation per halaman via `generate_background()` (`image_service.py`).
5. ✅ Progress disimpan di `payload_json["_result_meta"]` secara incremental.
6. ✅ Fallback deterministic per halaman (reference image → transparent PNG).
7. ✅ Draft mode: reference image dilewati untuk mempercepat render.

### Phase D - ZIP builder ✅ DONE

1. ✅ Kumpulkan bytes semua halaman sukses.
2. ✅ Naming konsisten: `page-01.png`, `page-02.png`, dst.
3. ✅ Build ZIP via `zipfile.ZipFile` + upload ke storage.
4. ✅ `zip_url` disimpan di `_result_meta` dan di-return pada status response.

### Phase E - Observability ✅ DONE

1. ✅ `logger.info` per halaman dengan prompt prefix.
2. ✅ `logger.warning` saat AI generation gagal per halaman.
3. ✅ `phase_message` diupdate per halaman ke DB untuk polling frontend.

## 8. Frontend Implementation Plan

### Phase A - API client/types ✅ DONE

1. ✅ Tambah 7 interface baru di `src/lib/api/types.ts`:
   - `CatalogRenderQualityMode`, `CatalogRenderOptions`, `CatalogRenderStartRequest`
   - `CatalogRenderStartResponse`, `CatalogRenderProgress`, `CatalogRenderPageStatus`, `CatalogRenderStatusResponse`
2. ✅ Fungsi `startCatalogRender` dan `getCatalogRenderStatus` di `src/lib/api/catalogApi.ts`.
3. ✅ Di-export via `useProjectApi()` di `src/lib/api/index.ts`.

### Phase B - Preview action branch ✅ DONE

1. ✅ Branch `if (brief.goal === "catalog")` di `handleGenerate()` pada `app/design/new/preview/page.tsx`.
2. ✅ Goal non-catalog tetap memanggil `generateDesign`.
3. ✅ `job_id` disimpan ke session state (`catalogRenderJobId`).

### Phase C - Polling and UI state ✅ DONE

1. ✅ Poll tiap 2 detik, max 180 attempts (360 detik timeout).
2. ✅ `catalogRenderProgressLabel` diupdate dari `phase_message` + `progress.completed_pages/total_pages`.
3. ✅ Error state informatif jika `failed` atau timeout.

### Phase D - Gallery and download ✅ DONE

1. ✅ State `catalogRenderResult` menampilkan gallery grid thumbnail setelah `completed`.
2. ✅ Badge "Fallback" per halaman saat `fallback_used = true`.
3. ✅ Tombol "Buka di editor" per halaman via `openInEditor`.
4. ✅ Tombol download ZIP `<a href={zip_url} download>` muncul saat `zip_url` tersedia.
5. ✅ Tombol Generate berubah ke "Render selesai" dan disabled saat gallery sudah tampil.

### Phase E - Session persistence ✅ DONE

1. ✅ `DesignBriefSessionState` diperluas: `catalogRenderJobId`, `catalogRenderStatus`, `catalogRenderZipUrl`, `catalogRenderedPages`.
2. ✅ State dipersist ke `localStorage` via `persistBriefState`.

## 9. Testing Strategy

### 9.1 Backend tests ✅ DONE (19 tests passing)

File: `backend/tests/test_catalog_render_service.py` dan `test_catalog_render_worker.py`

1. ✅ Credit calculation (1/page, edge case 0 pages).
2. ✅ `serialize_catalog_render_status` (empty meta, with pages, clamped completed_pages, error field).
3. ✅ `_build_page_visual_prompt` (cover/product, service, unknown type, empty title, semua 4 tone).
4. ✅ `start_catalog_render_job` — create+dispatch dan reuse existing job.
5. ✅ Worker happy path AI generation.
6. ✅ Worker fallback saat AI gagal.
7. ✅ Worker cancel at start.
8. ✅ Worker zero pages raises ValueError.
9. ✅ Worker all pages fail → refund triggered.
10. ✅ Worker draft mode skips reference image.

### 9.2 Frontend tests

> Belum diimplementasi — unit test React/component untuk gallery dan polling flow direncanakan di v1.1.

### 9.3 E2E tests

> Belum diimplementasi — Playwright E2E untuk catalog render happy path direncanakan di v1.1.

## 10. Rollout Plan

1. Tambahkan feature flag backend dan frontend untuk `catalog_render_v1`.
2. Aktifkan internal testing (team only).
3. Canary ke persentase kecil user.
4. Pantau KPI selama 3-7 hari.
5. Rollout penuh jika stabil.

### 10.1 Rollback plan

1. Matikan feature flag `catalog_render_v1`.
2. Kembalikan flow ke behavior planning-only.
3. Investigasi root cause berdasarkan logs dan metrics.

## 11. Risiko dan Mitigasi

1. Biaya AI tinggi untuk halaman banyak.
   - Mitigasi: batasi halaman maksimum default dan gunakan `quality_mode`.
2. Latensi tinggi.
   - Mitigasi: progress feedback jelas dan fallback deterministic.
3. Kegagalan upload storage.
   - Mitigasi: retry upload dan fail-safe error handling.
4. Job orphan saat worker crash.
   - Mitigasi: timeout watchdog dan recovery status job.
5. Regresi flow lama.
   - Mitigasi: branching logic ketat catalog vs non-catalog dan regression tests.

## 12. Rencana Eksekusi (Milestone)

Milestone 1 — Schema + API contract ✅ DONE 2026-04-30

1. ✅ Schema 6 model baru di `app/schemas/catalog.py`.
2. ✅ Endpoint `POST /api/catalog/render` + `GET /api/catalog/render/{job_id}`.
3. ✅ Service `catalog_render_service.py` dengan credit logic.

Milestone 2 — AI render per halaman + ZIP ✅ DONE 2026-04-30

1. ✅ Worker `ai_tool_jobs_catalog.py` dengan `generate_background()` per halaman.
2. ✅ `_build_page_visual_prompt()` menghasilkan prompt dari page metadata.
3. ✅ ZIP builder + upload storage.
4. ✅ Fallback deterministic per halaman.
5. ✅ Draft mode optimasi (skip reference).

Milestone 3 — Frontend integration ✅ DONE 2026-04-30

1. ✅ Types + API client (`catalogApi.ts`).
2. ✅ Preview branching catalog vs non-catalog.
3. ✅ Polling + progress label.
4. ✅ Gallery grid + badge fallback + "Buka di editor" per halaman.
5. ✅ Download ZIP button.
6. ✅ Session persistence.

Milestone 4 — Tests + Quality ✅ DONE 2026-04-30

1. ✅ 19 backend unit tests passing.
2. ✅ Ruff clean (backend + test files).
3. ✅ ESLint clean (frontend).
4. ✅ Next.js production build clean.

Milestone 5 — E2E + Canary (v1.1, belum dimulai)

1. Playwright E2E catalog render happy path.
2. Feature flag `catalog_render_v1` untuk canary rollout.
3. Dashboard metric latency + success rate.

## 13. Definition of Done

1. ✅ User catalog dapat menghasilkan output multipage nyata.
2. ✅ Gallery hasil tampil di preview.
3. ✅ ZIP bisa diunduh dan berisi semua halaman.
4. ✅ Fallback per halaman berjalan saat terjadi failure parsial.
5. ✅ Semua test kritikal pass (19/19 backend tests).
6. ✅ Tidak ada regresi flow non-catalog (build + lint clean).
7. ✅ Logging structured per halaman (`logger.info`/`logger.warning` di worker).

**Status keseluruhan: v1 SHIPPED ✅**
Todo v1.1: Frontend unit tests, Playwright E2E, feature flag canary rollout.

## 14. Checklist Eksekusi Cepat

1. Backend: schema, router, model, service render, ZIP builder.
2. Frontend: API client, polling state, gallery, download action.
3. Testing: backend unit/integration, frontend, E2E smoke.
4. Operasional: feature flag, dashboard metric, canary plan.

## 15. Catatan Implementasi

1. Reuse code pada level pola, bukan copy mentah tanpa adaptasi domain katalog.
2. Jaga separation antara planning service dan rendering service.
3. Tetap gunakan pipeline CI/CD untuk build/deploy (hindari build Docker manual di VPS).
