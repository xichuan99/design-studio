# Catalog Render End-to-End Implementation Plan

Tanggal: 2026-04-30  
Status: Draft for implementation  
Owner: Backend + Frontend Team

## 1. Ringkasan

Saat ini flow katalog sudah berhasil sampai tahap planning (struktur, style, mapping, copy, final plan), tetapi belum menghasilkan output katalog jadi. Dokumen ini mendefinisikan rencana implementasi agar flow katalog benar-benar bisa:

1. Menjalankan render multipage berbasis final plan.
2. Menyediakan hasil per halaman untuk preview gallery.
3. Menyediakan unduhan ZIP berisi PNG tiap halaman.

Keputusan produk yang dipakai:

1. Output format fase awal: ZIP berisi PNG per halaman.
2. Engine render: AI generation per halaman.
3. UX delivery: tampil gallery hasil dulu, lalu user bisa download ZIP.

## 2. Tujuan dan KPI

## Tujuan fungsional

1. User dengan goal catalog dapat menekan Generate dan mendapatkan hasil katalog multipage, bukan single design.
2. User dapat memantau progres render sampai selesai.
3. User dapat melihat hasil halaman-halaman katalog sebelum unduh.

## KPI teknis

1. Keberhasilan job render katalog minimal 90% untuk request valid.
2. Median waktu selesai untuk 5 halaman <= 150 detik.
3. Error tanpa fallback per halaman <= 5%.
4. Tidak ada regresi pada flow non-catalog.

## 3. Scope

## In scope

1. Endpoint backend untuk start render katalog dan status render katalog.
2. Orkestrasi render per halaman dari final plan.
3. Penyimpanan hasil per halaman + packaging ZIP.
4. Integrasi frontend preview untuk trigger render katalog.
5. Gallery hasil di preview + tombol download ZIP.
6. Telemetry dan logging untuk observability.
7. Unit/integration test utama backend dan frontend.

## Out of scope (fase ini)

1. Ekspor PDF multipage native.
2. Integrasi langsung ke editor multipage canvas internal.
3. Fine-grained template editor untuk tiap halaman katalog.

## 4. Arsitektur Solusi

## Alur tinggi

1. Interview flow menghasilkan catalogFinalPlan seperti sekarang.
2. Preview flow (goal catalog) memanggil endpoint baru start render katalog.
3. Backend membuat job render katalog dengan status queued.
4. Worker/service memproses halaman 1..N, menghasilkan gambar per halaman.
5. Backend memperbarui progres dan daftar hasil halaman secara incremental.
6. Setelah semua halaman selesai, backend membuat ZIP dan menyimpan zip_url.
7. Frontend polling status, menampilkan gallery saat completed, lalu download ZIP.

## Prinsip desain

1. Planning flow existing tidak diubah drastis.
2. Render flow katalog dipisahkan dari generate desain single image.
3. Fallback per halaman wajib ada agar job total tetap bisa complete.
4. API status dibuat stabil agar frontend mudah polling.

## 5. API Contract (Proposed)

## 5.1 Start Render

Endpoint: POST /api/catalog/render

Request body:

- final_plan: object (hasil finalize-plan)
- options:
- aspect_ratio: string (default 1:1)
- language: string (default id)
- quality_mode: string (draft | standard | high)
- reference_image_url: string optional

Response:

- job_id: string
- status: queued | processing
- total_pages: number
- created_at: ISO datetime

## 5.2 Get Render Status

Endpoint: GET /api/catalog/render/{job_id}

Response:

- job_id: string
- status: queued | processing | completed | failed
- progress:
- completed_pages: number
- total_pages: number
- percent: number
- pages: array
- page_number: number
- status: completed | failed | fallback
- result_url: string optional
- error_message: string optional
- zip_url: string optional (filled when completed)
- error_message: string optional (top-level)

## 5.3 Error semantics

1. 400 untuk request invalid.
2. 401/403 mengikuti auth policy existing.
3. 404 jika job_id tidak ditemukan atau tidak milik user.
4. 500 untuk failure internal tanpa fallback total.

## 6. Data Model Strategy

Ada dua opsi:

1. Extend model jobs existing.
2. Tambah model baru catalog_render_jobs + catalog_render_pages.

Rekomendasi: model baru agar tidak mencampur semantics single-image dan multipage.

## Tabel usulan

catalog_render_jobs:

1. id (uuid)
2. user_id
3. status
4. total_pages
5. completed_pages
6. input_plan_json
7. zip_url
8. error_message
9. created_at
10. completed_at

catalog_render_pages:

1. id (uuid)
2. job_id
3. page_number
4. status
5. prompt_used
6. result_url
7. fallback_used (bool)
8. error_message
9. created_at
10. updated_at

## 7. Backend Implementation Plan

## Phase A - Contract and schema

1. Tambah schema request/response baru di modul schema katalog.
2. Tambah validator untuk memastikan final plan valid.
3. Tambah typed status payload per halaman.

## Phase B - Router and orchestration

1. Tambah route POST /api/catalog/render.
2. Tambah route GET /api/catalog/render/{job_id}.
3. Integrasi auth dan ownership check.
4. Integrasi credit charging policy katalog.

## Phase C - Render service multipage

1. Buat service orchestration render_catalog_job.
2. Iterasi halaman dari final plan.
3. Compose prompt halaman dari type/layout/content/style.
4. Panggil AI image generation per halaman.
5. Simpan hasil per halaman.
6. Bila gagal, generate fallback deterministic per halaman.
7. Update progress secara berkala.

## Phase D - ZIP builder

1. Ambil semua page image hasil render.
2. Susun nama file page-01.png, page-02.png, dst.
3. Build ZIP dan upload ke storage.
4. Simpan zip_url di job.

## Phase E - Observability

1. Structured log per transisi status job.
2. Structured log per halaman (started/completed/fallback/failed).
3. Metric success rate, latency, fallback rate.

## 8. Frontend Implementation Plan

## Phase A - API client/types

1. Tambah type CatalogRenderStartRequest.
2. Tambah type CatalogRenderStatusResponse.
3. Tambah fungsi startCatalogRender dan getCatalogRenderStatus di catalogApi.

## Phase B - Preview action branch

1. Pada halaman preview, jika goal catalog maka trigger startCatalogRender.
2. Jangan panggil generateDesign biasa untuk goal catalog.
3. Simpan job id ke session state.

## Phase C - Polling and UI state

1. Poll status tiap 2 detik sampai completed/failed.
2. Tampilkan progress count (completed_pages/total_pages).
3. Tampilkan error state yang informatif jika failed.

## Phase D - Gallery and download

1. Setelah completed, tampilkan grid halaman (thumbnail).
2. Tampilkan badge halaman fallback jika ada.
3. Sediakan tombol download ZIP.

## Phase E - Session persistence

1. Simpan catalog render state agar refresh browser tidak kehilangan progres.
2. Restore polling jika ada job in-progress.

## 9. Testing Strategy

## Backend tests

1. Schema validation tests:
- final plan valid diterima
- final plan invalid ditolak
2. API tests:
- start render mengembalikan job_id
- status endpoint mengembalikan progress yang benar
3. Service tests:
- sukses penuh semua halaman
- beberapa halaman gagal lalu fallback
- ZIP tetap terbuat saat fallback
4. Security/ownership tests:
- user tidak bisa akses job user lain

## Frontend tests

1. Preview branch test:
- goal catalog memanggil endpoint render katalog
- goal non-catalog tetap memanggil generateDesign
2. Polling test:
- state transisi queued -> processing -> completed
3. Gallery test:
- halaman tampil sesuai jumlah page
- badge fallback tampil saat fallback_used true
4. Download test:
- tombol aktif saat zip_url tersedia

## E2E tests

1. End-to-end catalog happy path 5 halaman.
2. End-to-end path dengan fallback salah satu halaman.
3. End-to-end failure total untuk pesan error user-friendly.

## 10. Rollout Plan

1. Tambahkan feature flag backend dan frontend untuk catalog render v1.
2. Aktifkan internal testing (team only).
3. Canary ke persentase kecil user.
4. Pantau KPI 3-7 hari.
5. Rollout penuh jika stabil.

## Rollback plan

1. Matikan feature flag catalog render v1.
2. Kembalikan flow ke planning-only behavior.
3. Investigasi root cause dari logging/metrics.

## 11. Risiko dan Mitigasi

1. Biaya AI tinggi untuk halaman banyak.
- Mitigasi: batasi total halaman AI render default, tambah quality mode.
2. Latensi tinggi.
- Mitigasi: progress feedback jelas + fallback deterministic.
3. Kegagalan storage upload.
- Mitigasi: retry upload + fail-safe error handling.
4. Job orphan saat worker crash.
- Mitigasi: timeout watchdog dan recovery status job.
5. Regresi flow lama.
- Mitigasi: branch logic ketat untuk catalog vs non-catalog + regression tests.

## 12. Rencana Eksekusi (Milestone)

Milestone 1 (2-3 hari):

1. Schema + endpoint start/status + model job baru.
2. Stub render service + status polling dasar.

Milestone 2 (3-5 hari):

1. Implement AI render per halaman + fallback.
2. ZIP builder + storage upload.
3. API tests utama.

Milestone 3 (2-4 hari):

1. Integrasi frontend preview + polling + gallery + download.
2. Frontend tests utama.

Milestone 4 (1-2 hari):

1. Hardening observability.
2. E2E smoke dan canary prep.

## 13. Definition of Done

1. User catalog bisa menghasilkan output multipage nyata.
2. Gallery hasil tampil di preview.
3. ZIP bisa diunduh dan berisi semua halaman.
4. Fallback per halaman berjalan saat ada failure parsial.
5. Semua test kritikal pass.
6. Tidak ada regresi flow non-catalog.
7. Logging dan metrics cukup untuk incident triage.

## 14. Catatan Implementasi

1. Reuse code hanya pada pola, bukan copy mentah tanpa adaptasi domain katalog.
2. Jagakan separation antara planning service dan rendering service.
3. Tetap gunakan CI/CD pipeline untuk build/deploy, tidak build Docker manual di VPS.
