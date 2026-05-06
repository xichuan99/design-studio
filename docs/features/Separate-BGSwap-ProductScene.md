---
goal: Separate Background Swap and Product Scene with clear policy and output differentiation
version: 1.0
date_created: 2026-04-27
status: In Progress
tags: [feature, ai-tools, ux, backend, frontend]
owner: Product + Frontend + Backend + QA
---

# Implementation Plan: Product Scene and Background Swap Separation

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

## Progress Update (2026-04-27)

Ringkasan progress implementasi saat ini:
- Selesai: Phase 1, 2, 3, 4, 5, 7.
- Selesai sebagian besar: Phase 6 dan 8.
- Lanjutan terbaru: redirect handoff Product Scene -> Background Swap dengan file carry-over berbasis feature flag di frontend.

Status phase:
- Phase 1 (UX copy separation): Selesai
- Phase 2 (subject classification): Selesai
- Phase 3 (backend enforcement): Selesai
- Phase 4 (frontend preflight + redirect UX): Selesai
- Phase 5 (batch alignment): Selesai
- Phase 6 (quality upgrade): In Progress
- Phase 7 (credit safety + integrity): Selesai
- Phase 8 (telemetry + rollout): In Progress

## 1. Scope & Non-Goals

### In scope
- Memperjelas pemisahan fungsi antara Background Swap dan Product Scene.
- Menjadikan Product Scene khusus untuk foto produk non-manusia.
- Menambahkan subject-classification gate untuk memblokir manusia pada Product Scene.
- Menambahkan preflight UX di frontend agar user tahu lebih awal jika input tidak cocok.
- Meningkatkan kualitas output Product Scene agar berbeda jelas dari Background Swap.
- Menyesuaikan batch flow, async jobs, dan policy kredit agar konsisten dengan aturan baru.
- Menambahkan telemetry untuk mengukur blokir, redirect, dan kualitas hasil.

### Out of scope
- Rewrite total arsitektur AI tools, job system, storage, atau queue.
- Mengubah semua tool AI lain agar memakai classifier yang sama.
- Membangun moderation platform generik lintas semua image tools.
- Mendesain ulang editor atau canvas flow utama.
- Menambahkan perubahan schema database besar kecuali benar-benar diperlukan.

---

## 2. Problem Statement

Saat ini Product Scene secara struktural sudah terpisah dari Background Swap, tetapi secara hasil dan persepsi user masih terlalu dekat. Pada kasus tertentu, terutama foto manusia atau portrait studio, output Product Scene terasa seperti background swap dengan tambahan dekorasi, bukan scene-building yang grounded dan kredibel.

Akibatnya:
- User bingung kapan memakai Background Swap vs Product Scene.
- Ekspektasi Product Scene menjadi salah arah.
- Human input menghasilkan failure mode visual yang lebih parah dibanding product-only input.
- Nilai produk Product Scene menjadi tidak cukup berbeda dari Background Swap.

Karena itu, pemisahan harus dilakukan di dua level sekaligus:
- level produk dan UX: definisi, copy, redirect, expectation setting
- level sistem: hard-block manusia pada Product Scene dan upgrade kualitas scene generation

---

## 3. Product Definition

## 3.1 Background Swap

Definisi:
- Tool untuk mengganti latar sambil mempertahankan subject dan komposisi asli semaksimal mungkin.

Use cases utama:
- Portrait manusia
- Couple / wedding / fashion
- Foto studio yang hanya ingin diubah latarnya
- Produk yang membutuhkan perubahan latar konservatif

Karakter output:
- Preserve-first
- Subject tetap dominan
- Pose dan framing utama dipertahankan
- Relighting mengikuti konteks, tetapi tidak mengubah scene secara agresif

## 3.2 Product Scene

Definisi:
- Tool untuk membangun scene produk baru yang lebih kaya, dengan surface, props, ambience, depth, dan contact shadow yang logis.

Use cases utama:
- Foto produk tunggal
- Ecommerce hero image
- Lifestyle product scene untuk marketplace, social, ads
- Produk tanpa manusia sebagai subject utama

Karakter output:
- Scene-building
- Grounded composition
- Surface atau ground plane jelas
- Props dan ambience mendukung produk, bukan menggantikan fungsi subject

## 3.3 Policy Boundary

- Background Swap menerima manusia dan non-manusia.
- Product Scene tidak menerima manusia sebagai subject utama.
- Jika input mengandung manusia, user diarahkan ke Background Swap.
- Jika input ambigu atau campuran, sistem mengikuti policy konservatif.

---

## 4. Requirements & Constraints

- **REQ-001**: User harus melihat pembeda fungsi yang jelas antara Background Swap dan Product Scene sebelum mulai generate.
- **REQ-002**: Product Scene harus memblokir input manusia secara konsisten.
- **REQ-003**: Product Scene harus memberi feedback yang jelas ketika input ditolak dan menyediakan redirect ke Background Swap.
- **REQ-004**: Backend harus menjadi source of truth untuk enforcement policy, bukan frontend saja.
- **REQ-005**: Batch Product Scene harus mengikuti policy yang sama dengan single Product Scene.
- **REQ-006**: Jalur async jobs untuk Product Scene tidak boleh tetap memproses manusia jika frontend bypass terjadi.
- **REQ-007**: Product Scene harus punya output yang terasa berbeda secara kualitas dan karakter dari Background Swap.
- **REQ-008**: Product Scene harus menjaga bentuk produk, label, dan dominasi subject agar aman untuk ecommerce.
- **REQ-009**: Semua policy reject harus aman terhadap kredit user.
- **REQ-010**: Sistem harus menyimpan telemetry yang cukup untuk menilai false positive, false negative, dan dampak UX.

- **SEC-001**: Error ke UI tetap harus generik dan tidak expose stack trace internal.
- **SEC-002**: Semua request tetap lewat auth dan rate-limit yang sudah ada.
- **SEC-003**: Classifier tidak boleh menjadi jalur bypass untuk file validation yang sudah ada.

- **CON-001**: Reuse arsitektur existing sedapat mungkin, terutama async jobs dan service pipeline yang sudah ada.
- **CON-002**: Perubahan harus kompatibel dengan flow batch.
- **CON-003**: Perubahan frontend tidak boleh membuat Background Swap regress untuk use case manusia.
- **CON-004**: V1 sebaiknya tanpa perubahan schema database.
- **CON-005**: Jika classifier confidence rendah, sistem harus memilih policy yang aman.

---

## 5. Current Architecture Anchor

Implementasi saat ini sudah punya pemisahan jalur dasar:

Frontend:
- [frontend/src/app/tools/product-scene/page.tsx](frontend/src/app/tools/product-scene/page.tsx)
- [frontend/src/app/tools/background-swap/page.tsx](frontend/src/app/tools/background-swap/page.tsx)
- [frontend/src/app/tools/batch-process/page.tsx](frontend/src/app/tools/batch-process/page.tsx)
- [frontend/src/lib/api/aiToolsApi.ts](frontend/src/lib/api/aiToolsApi.ts)
- [frontend/src/lib/api/types.ts](frontend/src/lib/api/types.ts)

Backend:
- [backend/app/api/ai_tools_routers/creative.py](backend/app/api/ai_tools_routers/creative.py)
- [backend/app/api/ai_tools_routers/background.py](backend/app/api/ai_tools_routers/background.py)
- [backend/app/api/ai_tools_routers/jobs.py](backend/app/api/ai_tools_routers/jobs.py)
- [backend/app/workers/ai_tool_jobs_creative.py](backend/app/workers/ai_tool_jobs_creative.py)
- [backend/app/services/product_scene_service.py](backend/app/services/product_scene_service.py)
- [backend/app/services/batch_service.py](backend/app/services/batch_service.py)
- [backend/app/services/bg_suggest_service.py](backend/app/services/bg_suggest_service.py)

Test anchors:
- [backend/tests/test_product_scene.py](backend/tests/test_product_scene.py)
- [backend/tests/test_ai_tool_jobs_creative.py](backend/tests/test_ai_tool_jobs_creative.py)
- [backend/tests/test_batch.py](backend/tests/test_batch.py)
- [backend/tests/test_ai_tools.py](backend/tests/test_ai_tools.py)

Kesimpulan:
- Pemisahan endpoint sudah ada.
- Yang belum ada adalah boundary policy, preflight gating, dan differentiation quality.

---

## 6. Target Experience

## 6.1 Product Scene flow

1. User membuka halaman Product Scene.
2. User upload gambar.
3. Sistem menjalankan preflight classify.
4. Jika hasil `product`, user lanjut memilih theme/quality lalu generate.
5. Jika hasil `human`, proses diblokir dan user diarahkan ke Background Swap.
6. Jika hasil `mixed`, proses diblokir atau diarahkan ke Background Swap sesuai policy.
7. Jika hasil `uncertain`, user diberi warning dan rekomendasi default ke Background Swap.
8. Saat generate tetap dilakukan, backend mengulang enforcement sebelum menjalankan pipeline.
9. Output Product Scene hanya lolos jika memenuhi minimum quality checks.

## 6.2 Background Swap flow

1. User membuka halaman Background Swap.
2. User upload gambar manusia atau produk.
3. User memilih suggestion atau prompt custom.
4. Sistem generate preserve-first replacement.
5. Tidak ada block khusus untuk manusia.

---

## 7. Policy Design

## 7.1 Subject classification categories

Sistem klasifikasi minimal mengembalikan:
- `product`
- `human`
- `mixed`
- `uncertain`

Definisi:
- `product`: gambar didominasi objek/produk non-manusia
- `human`: gambar didominasi satu atau lebih manusia
- `mixed`: manusia dan produk sama-sama signifikan, atau produk dipresentasikan bersama manusia sebagai komposisi utama
- `uncertain`: sistem tidak yakin

## 7.2 Enforcement policy

| Subject Type | Product Scene | Background Swap | Notes |
|---|---|---|---|
| product | allow | allow | default case untuk produk |
| human | block | allow | redirect ke Background Swap |
| mixed | block | allow | V1 konservatif |
| uncertain | warn / soft-block | allow | rekomendasi default ke Background Swap |

Rekomendasi V1:
- `human`: hard block
- `mixed`: hard block
- `uncertain`: soft block di frontend, hard block atau confirmation policy di backend sesuai keputusan produk

## 7.3 Redirect policy

Jika Product Scene ditolak:
- tampilkan alasan singkat non-teknis
- jelaskan bahwa Product Scene dirancang khusus untuk foto produk tanpa manusia
- sediakan CTA langsung ke Background Swap
- pertahankan file yang sudah diupload jika memungkinkan agar user tidak perlu upload ulang

---

## 8. Implementation Phases

## Phase 1: Product Separation and UX Copy

### Goal
Menjadikan boundary kedua tool jelas di mata user sebelum menyentuh model logic.

### Tasks

| Task ID | Task | File(s) kandidat | Priority |
|---|---|---|---|
| P1-01 | Ubah headline dan supporting copy Product Scene agar eksplisit hanya untuk foto produk tanpa manusia | [frontend/src/app/tools/product-scene/page.tsx](frontend/src/app/tools/product-scene/page.tsx) | P0 |
| P1-02 | Ubah copy Background Swap agar eksplisit cocok untuk manusia dan preserve composition | [frontend/src/app/tools/background-swap/page.tsx](frontend/src/app/tools/background-swap/page.tsx) | P0 |
| P1-03 | Perbarui deskripsi Product Scene di batch flow agar tidak terdengar seperti sekadar ganti background | [frontend/src/app/tools/batch-process/page.tsx](frontend/src/app/tools/batch-process/page.tsx) | P0 |
| P1-04 | Audit naming dan description di listing assets dan landing surfaces | [frontend/src/components/assets/AssetGrid.tsx](frontend/src/components/assets/AssetGrid.tsx), [frontend/src/components/assets/AssetCard.tsx](frontend/src/components/assets/AssetCard.tsx), [frontend/src/components/landing/CapabilityMarquee.tsx](frontend/src/components/landing/CapabilityMarquee.tsx), [frontend/src/components/landing/ResultGallery.tsx](frontend/src/components/landing/ResultGallery.tsx) | P1 |
| P1-05 | Tambahkan helper copy untuk blocked-state dan redirect state | Product Scene page + shared UI jika perlu | P0 |

### Acceptance criteria
- User bisa memahami perbedaan dua tool hanya dari copy utama.
- Product Scene tidak lagi diposisikan sebagai background swap versi lain.

---

## Phase 2: Subject Classification Service

### Goal
Membuat decision layer tipis untuk menentukan apakah input layak masuk Product Scene.

### Tasks

| Task ID | Task | File(s) kandidat | Priority |
|---|---|---|---|
| P2-01 | Desain response schema subject classification | backend service + frontend types | P0 |
| P2-02 | Implement classifier service untuk image bytes atau image URL | service baru di `backend/app/services/` | P0 |
| P2-03 | Reuse pola vision analysis yang ringan dari service yang sudah ada | [backend/app/services/bg_suggest_service.py](backend/app/services/bg_suggest_service.py) sebagai referensi | P0 |
| P2-04 | Definisikan confidence dan fallback mapping ke `product/human/mixed/uncertain` | classifier service | P0 |
| P2-05 | Tambahkan logging/telemetry untuk hasil klasifikasi | classifier service + router/worker | P1 |

### Design notes
- V1 tidak perlu classifier “sempurna”; yang penting konservatif.
- Lebih aman salah mengarahkan user ke Background Swap daripada memaksa Product Scene memproses portrait.
- Jika classifier berbasis multimodal prompt, output harus terstruktur dan divalidasi ketat.

### Acceptance criteria
- Service bisa mengembalikan subject type yang konsisten untuk case produk murni, human portrait, dan mixed image.
- Service memiliki fallback ke `uncertain` saat parsing atau confidence tidak memadai.

---

## Phase 3: Backend Enforcement

### Goal
Menjadikan backend sebagai policy gate utama untuk Product Scene.

### Tasks

| Task ID | Task | File(s) kandidat | Priority |
|---|---|---|---|
| P3-01 | Tambahkan enforcement pada endpoint sinkron Product Scene | [backend/app/api/ai_tools_routers/creative.py](backend/app/api/ai_tools_routers/creative.py) | P0 |
| P3-02 | Tambahkan enforcement untuk async Product Scene create/execute path | [backend/app/api/ai_tools_routers/jobs.py](backend/app/api/ai_tools_routers/jobs.py), [backend/app/workers/ai_tool_jobs_creative.py](backend/app/workers/ai_tool_jobs_creative.py) | P0 |
| P3-03 | Tentukan kapan classification dilakukan pada async path: pre-job, pre-worker, atau keduanya | jobs + worker | P0 |
| P3-04 | Tambahkan handling error/policy reject yang user-friendly | creative router + worker result | P0 |
| P3-05 | Simpan metadata subject classification pada job/result metadata bila memungkinkan | jobs/result serialization | P1 |

### Recommended design
- Frontend melakukan preflight classify untuk UX.
- Backend tetap mengulang classify atau memverifikasi hasil classify sebelum generate.
- Worker Product Scene juga melakukan defense-in-depth check sebelum memanggil `generate_product_scene`.

### Acceptance criteria
- Request Product Scene dengan human input tidak pernah sampai menjalankan generation pipeline.
- Policy reject konsisten di sync dan async flows.

---

## Phase 4: Frontend Preflight and Redirect UX

### Goal
Mencegah user kehilangan waktu dan kredit karena rejection yang baru muncul terlambat.

### Tasks

| Task ID | Task | File(s) kandidat | Priority |
|---|---|---|---|
| P4-01 | Tambahkan API client untuk classify/preflight | [frontend/src/lib/api/aiToolsApi.ts](frontend/src/lib/api/aiToolsApi.ts) | P0 |
| P4-02 | Tambahkan types untuk classification result dan policy decision | [frontend/src/lib/api/types.ts](frontend/src/lib/api/types.ts) | P0 |
| P4-03 | Jalankan classify setelah upload di Product Scene page | [frontend/src/app/tools/product-scene/page.tsx](frontend/src/app/tools/product-scene/page.tsx) | P0 |
| P4-04 | Tampilkan blocker UI untuk human/mixed input | Product Scene page | P0 |
| P4-05 | Tambahkan CTA redirect ke Background Swap | Product Scene page | P0 |
| P4-06 | Pertimbangkan carry-over file state agar upload tidak diulang | Product Scene page + Background Swap page | P1 |
| P4-07 | Tampilkan warning state untuk `uncertain` | Product Scene page | P1 |

### UX copy recommendation
- Product Scene blocker:
  - “Tool ini dirancang untuk foto produk tanpa manusia.”
  - “Untuk foto manusia atau portrait, gunakan Background Swap agar hasil lebih natural.”
- CTA:
  - “Lanjut ke Background Swap”

### Acceptance criteria
- User menerima feedback sebelum job dibuat.
- Redirect flow terasa natural dan tidak membingungkan.

---

## Phase 5: Batch Flow Alignment

### Goal
Membuat batch Product Scene mengikuti boundary policy yang sama tanpa membingungkan hasil akhir.

### Tasks

| Task ID | Task | File(s) kandidat | Priority |
|---|---|---|---|
| P5-01 | Definisikan policy batch untuk human/mixed input | product spec + backend batch | P0 |
| P5-02 | Implement per-item classification pada batch Product Scene | [backend/app/services/batch_service.py](backend/app/services/batch_service.py) | P0 |
| P5-03 | Kembalikan hasil parsial yang menjelaskan file mana yang diblokir policy | batch service + frontend batch result UI | P0 |
| P5-04 | Sesuaikan perhitungan charge atau refund untuk item yang diblokir | batch path + jobs path | P0 |
| P5-05 | Update batch UI copy agar Product Scene jelas hanya untuk produk | [frontend/src/app/tools/batch-process/page.tsx](frontend/src/app/tools/batch-process/page.tsx) | P0 |

### Recommendation
Gunakan partial-success policy:
- item produk diproses
- item manusia diblokir
- hasil batch tetap jadi
- user mendapat daftar file yang ditolak karena policy

### Acceptance criteria
- Batch Product Scene tidak diam-diam memproses manusia.
- User mengerti kenapa sebagian file diproses dan sebagian tidak.

---

## Phase 6: Product Scene Quality Upgrade

### Goal
Membuat Product Scene punya pembeda visual yang masuk akal dibanding Background Swap.

### Tasks

| Task ID | Task | File(s) kandidat | Priority |
|---|---|---|---|
| P6-01 | Revisi theme prompt dari background-oriented menjadi scene-oriented | [backend/app/services/product_scene_service.py](backend/app/services/product_scene_service.py) | P0 |
| P6-02 | Tambahkan scene rules per theme: surface, placement, contact shadow, prop dominance | [backend/app/services/product_scene_service.py](backend/app/services/product_scene_service.py) | P0 |
| P6-03 | Audit preset theme agar relevan untuk ecommerce, bukan sekadar dekoratif | [backend/app/services/product_scene_service.py](backend/app/services/product_scene_service.py) | P0 |
| P6-04 | Tambahkan output-quality validator ringan untuk obvious-fail cases | product scene service | P1 |
| P6-05 | Tambahkan fallback atau regenerate policy bila validator gagal | product scene service | P1 |
| P6-06 | Pastikan label/shape produk tetap terjaga | product scene service tests | P0 |

### Quality rules minimum
- Produk harus punya contact shadow atau contact cue yang logis.
- Produk tidak boleh terlihat melayang.
- Props tidak boleh lebih dominan dari produk.
- Surface atau ground plane harus jelas.
- Produk tidak boleh berubah bentuk secara signifikan.
- Label atau siluet produk harus tetap terbaca.

### Example preset direction
- Studio tabletop
- Luxury vanity
- Organic natural
- Festive promo
- Kitchen counter
- Bathroom shelf

### Acceptance criteria
- Output Product Scene terasa staged dan grounded.
- Perbedaan terhadap Background Swap terlihat jelas secara visual.

---

## Phase 7: Credit Safety and Job Integrity

### Goal
Memastikan enforcement policy tidak merugikan user dari sisi kredit dan status job.

### Tasks

| Task ID | Task | File(s) kandidat | Priority |
|---|---|---|---|
| P7-01 | Audit kapan charge terjadi di sync, async, dan batch Product Scene | [backend/app/api/ai_tools_routers/creative.py](backend/app/api/ai_tools_routers/creative.py), [backend/app/api/ai_tools_routers/jobs.py](backend/app/api/ai_tools_routers/jobs.py) | P0 |
| P7-02 | Tentukan apakah block terjadi sebelum charge atau melalui refund | backend routers + workers | P0 |
| P7-03 | Tambahkan test refund/no-charge untuk policy reject | backend tests | P0 |
| P7-04 | Sertakan reason code untuk reject supaya support dan analytics jelas | jobs/result meta | P1 |

### Recommendation
Urutan ideal:
1. validate file
2. classify subject
3. jika blocked, reject tanpa charge
4. jika allowed, baru charge dan create/generate

Jika async path sulit diubah penuh pada V1:
- tetap charge saat job dibuat
- lakukan refund otomatis saat worker mendeteksi human input
- simpan reason metadata yang eksplisit

### Acceptance criteria
- Tidak ada kredit hilang tanpa alasan yang bisa dijelaskan.
- Support team bisa membedakan policy reject dari runtime failure.

---

## Phase 8: Telemetry and Rollout

### Goal
Membuat perubahan bisa diukur dan dirilis secara aman.

### Tasks

| Task ID | Task | File(s) kandidat | Priority |
|---|---|---|---|
| P8-01 | Tambahkan event tracking untuk blocker Product Scene | frontend Product Scene page | P1 |
| P8-02 | Tambahkan event redirect ke Background Swap | frontend Product Scene page | P1 |
| P8-03 | Tambahkan event classification outcome | frontend/backend telemetry | P1 |
| P8-04 | Tambahkan event output validation fail | backend Product Scene service | P1 |
| P8-05 | Tentukan feature flag bila rollout perlu bertahap | frontend/backend config | P1 |

### Suggested events
- `product_scene_preflight_started`
- `product_scene_classified_product`
- `product_scene_classified_human`
- `product_scene_classified_mixed`
- `product_scene_classified_uncertain`
- `product_scene_blocked`
- `product_scene_redirect_background_swap`
- `product_scene_generation_started`
- `product_scene_validation_failed`
- `product_scene_generation_completed`

### Rollout recommendation
1. Internal dogfood
2. Small rollout
3. Monitor reject rate and support complaints
4. Full rollout jika false positive masih acceptable

---

## 9. API Design Recommendation

## 9.1 New preflight endpoint

Recommended endpoint:
- `POST /api/tools/product-scene/preflight`

Request:
- image file atau image url
- optional mode flags jika diperlukan

Response:
- `subject_type`
- `confidence`
- `allowed_tools`
- `recommended_tool`
- `reason`
- `policy_action`

Example response shape:
- `subject_type`: `product | human | mixed | uncertain`
- `policy_action`: `allow | block | warn`
- `recommended_tool`: `product_scene | background_swap`

## 9.2 Async path policy

Jika tetap memakai `/jobs` generic flow:
- classification bisa dilakukan sebelum job create, atau
- payload menyimpan hasil preflight, lalu worker memverifikasi lagi

Rekomendasi:
- preflight terpisah untuk UX
- backend worker tetap validasi ulang untuk security and integrity

---

## 10. File-Level Change Plan

## 10.1 Frontend

| File | Planned change |
|---|---|
| [frontend/src/app/tools/product-scene/page.tsx](frontend/src/app/tools/product-scene/page.tsx) | tambah copy boundary, preflight classify, blocked state, warning state, redirect CTA |
| [frontend/src/app/tools/background-swap/page.tsx](frontend/src/app/tools/background-swap/page.tsx) | perjelas positioning manusia/preserve-first |
| [frontend/src/app/tools/batch-process/page.tsx](frontend/src/app/tools/batch-process/page.tsx) | update operation description, batch policy messaging, partial blocked item UX |
| [frontend/src/lib/api/aiToolsApi.ts](frontend/src/lib/api/aiToolsApi.ts) | tambah method preflight classify |
| [frontend/src/lib/api/types.ts](frontend/src/lib/api/types.ts) | tambah subject classification types |
| [frontend/src/components/assets/AssetGrid.tsx](frontend/src/components/assets/AssetGrid.tsx) | audit label/deskripsi Product Scene |
| [frontend/src/components/assets/AssetCard.tsx](frontend/src/components/assets/AssetCard.tsx) | audit label/deskripsi Product Scene |
| [frontend/src/components/landing/CapabilityMarquee.tsx](frontend/src/components/landing/CapabilityMarquee.tsx) | audit wording bila terlalu overlap |
| [frontend/src/components/landing/ResultGallery.tsx](frontend/src/components/landing/ResultGallery.tsx) | audit positioning hasil Product Scene |

## 10.2 Backend

| File | Planned change |
|---|---|
| [backend/app/api/ai_tools_routers/creative.py](backend/app/api/ai_tools_routers/creative.py) | enforce Product Scene subject policy pada endpoint sinkron dan batch parameter rules |
| [backend/app/api/ai_tools_routers/jobs.py](backend/app/api/ai_tools_routers/jobs.py) | review async credit and validation sequence |
| [backend/app/workers/ai_tool_jobs_creative.py](backend/app/workers/ai_tool_jobs_creative.py) | defense-in-depth validation dan refund path jika blocked |
| [backend/app/services/product_scene_service.py](backend/app/services/product_scene_service.py) | prompt/scene upgrade, validator, fallback |
| [backend/app/services/batch_service.py](backend/app/services/batch_service.py) | per-item classify and partial success behavior |
| [backend/app/services/bg_suggest_service.py](backend/app/services/bg_suggest_service.py) | referensi reuse pattern untuk lightweight vision analysis |

## 10.3 Tests

| File | Planned change |
|---|---|
| [backend/tests/test_product_scene.py](backend/tests/test_product_scene.py) | tambah tests untuk human block, mixed, uncertain, validator path |
| [backend/tests/test_ai_tool_jobs_creative.py](backend/tests/test_ai_tool_jobs_creative.py) | tambah tests untuk async enforcement dan refund |
| [backend/tests/test_batch.py](backend/tests/test_batch.py) | tambah tests untuk batch partial-success policy |
| [backend/tests/test_ai_tools.py](backend/tests/test_ai_tools.py) | tambah endpoint validation tests |

---

## 11. Testing Strategy

### Backend tests
- Product Scene reject human input.
- Product Scene reject mixed input.
- Product Scene behavior untuk uncertain sesuai policy.
- Product Scene allow product input.
- Async Product Scene tidak menjalankan generation jika diblokir.
- Refund atau no-charge berjalan sesuai desain.
- Batch Product Scene memproses item produk dan menolak item manusia sesuai policy.
- Output validator dan fallback tidak mematahkan happy path.

### Frontend manual tests
- Upload portrait ke Product Scene harus memunculkan blocker.
- CTA ke Background Swap harus terlihat dan berfungsi.
- Upload produk ke Product Scene harus tetap bisa generate.
- Background Swap harus tetap menerima portrait.
- Batch Product Scene harus menjelaskan item yang diblokir.

### Optional E2E
- Skenario 1: portrait -> Product Scene -> blocked -> redirect -> Background Swap
- Skenario 2: product -> Product Scene -> success
- Skenario 3: mixed batch -> partial success with clear messaging

---

## 12. Risks & Mitigations

| Risk | Level | Mitigation |
|---|---|---|
| Classifier false positive memblokir produk valid | High | gunakan `uncertain`, simpan telemetry, mulai konservatif |
| Classifier false negative meloloskan manusia | High | backend re-check + validator + monitoring |
| User merasa dibatasi tanpa penjelasan | Medium | blocker copy harus jelas dan redirect langsung |
| Credit handling membingungkan di async path | High | no-charge before generate atau refund otomatis yang teruji |
| Batch result membingungkan | Medium | partial-success summary + blocked reason per file |
| Product Scene quality belum cukup beda | High | prioritaskan phase quality upgrade setelah gating stabil |

---

## 13. Definition of Done

- [x] Product Scene secara UX jelas diposisikan hanya untuk produk non-manusia.
- [x] Background Swap secara UX jelas diposisikan untuk preserve-first termasuk manusia.
- [x] Product Scene memblokir input manusia pada single flow.
- [x] Product Scene memblokir atau menolak input manusia pada batch flow sesuai policy.
- [x] Async jobs Product Scene tidak memproses manusia ketika frontend bypass terjadi.
- [x] Kredit aman untuk semua policy reject cases.
- [x] Product Scene output terasa berbeda dari Background Swap pada sample valid.
- [x] Telemetry tersedia untuk classification outcome, block, redirect, dan generation result.
- [x] Test coverage ditambah untuk sync, async, batch, dan policy paths.

---

## 14. Recommended Delivery Order

## Sprint A — Boundary and Safety
- Phase 1
- Phase 2
- Phase 3
- Phase 4

Tujuan:
- user tidak salah masuk tool
- human input berhenti sebelum merusak pengalaman Product Scene

## Sprint B — Batch and Credit Integrity
- Phase 5
- Phase 7

Tujuan:
- kebijakan konsisten di semua jalur
- tidak ada ambiguity soal kredit

## Sprint C — Quality Differentiation
- Phase 6
- Phase 8

Tujuan:
- Product Scene benar-benar punya nilai beda, bukan hanya policy beda

---

## 15. Immediate Next Actions

1. Jalankan manual QA pass untuk 3 skenario kunci: product, human, dan mixed (single + batch).
2. Verifikasi dashboard telemetry untuk event `product_scene_validation_failed` dan `product_scene_redirect_background_swap`.
3. Siapkan release notes internal dan enable rollout bertahap dengan feature flags (`NEXT_PUBLIC_PRODUCT_SCENE_REDIRECT_V1` dan `NEXT_PUBLIC_PRODUCT_SCENE_REDIRECT_HANDOFF_V1`).
4. ~~Tambahkan E2E test opsional untuk flow portrait -> blocked -> redirected -> background swap with handoff.~~ **DONE** — `frontend/tests/e2e/product-scene-redirect-handoff.spec.ts`
5. Monitor 3-7 hari pertama untuk false positive rate classifier dan ticket support.