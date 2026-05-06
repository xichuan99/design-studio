# Frontend Code Audit Report — SmartDesign Studio

**Audit Date:** 2026-05-06
**Scope:** ModelSelector, compare-models, LandingPageClient, create flow, start page, layout, vs pages
**Base Path:** `/Users/nugroho/Documents/design-studio/frontend/src/`

---

## CRITERIA
1. **Code Quality** — Type safety, error handling, loading states
2. **Fitur vs Marketing** — Apakah sesuai klaim di `product-context.md`
3. **Bug / Incomplete** — Bug atau incomplete implementation
4. **Brand Voice ID** — Konsistensi Bahasa Indonesia

---

## FILE 1: `components/create/inputs/ModelSelector.tsx` (135 lines)

### 1. Code Quality: ⭐⭐⭐⭐ (Baik)
- **Type safety:** Props typed with `ModelSelectorProps`. Using `ModelCatalogItem` and `ModelTier` from `@/lib/api`. Semua ter-cover.
- **Loading state:** Tidak ada loading async di komponen ini (items diterima dari parent), jadi OK.
- **Error handling:** Tombol disabled saat `isInputLocked` + `!item.accessible`. Aksesibilitas di-handle dengan `Lock` icon + `reason` text.
- **Minor:** `useMemo` dipakai untuk `defaultItem` dan `advancedItems` → good optimization.

### 2. Fitur vs Marketing: ⭐⭐⭐⭐ (Sesuai)
- Product context menyebut **Model Selector** (baris 276) dan **Model Tier** (baris 275). Komponen ini mengimplementasikan: Auto, Basic, Pro, Ultra tiers. Label "Cepat & Murah" dan "Kualitas Premium" dari marketing context (baris 9) tidak muncul secara eksplisit di komponen — tier diserahkan ke backend (`ModelCatalogItem.label`).
- **Gap kecil:** Marketing menyebut tier Basic = "Cepat & Murah" dan Pro = "Kualitas Premium". ModelSelector tidak menampilkan mapping ini, tergantung backend. OK jika backend sudah set label sesuai.

### 3. Bug / Incomplete: Tidak ada bug signifikan.
- **Minor:** Fungsi `handleSelect` memanggil `onChange` dan `onSelectTier` — ini double-callback, bisa menyebabkan double analytics tracking. Tapi ini desain yang disengaja (onChange untuk state, onSelectTier untuk analytics).

### 4. Brand Voice ID: ⭐⭐⭐⭐ (Baik)
- "Model AI", "Opsi Lanjutan", "Default akun Anda", "Dipilih" — konsisten dengan tone formal-friendly.
- "Mulai dari Auto untuk pilihan aman. Buka opsi lanjutan jika ingin mengatur kualitas secara eksplisit." → tone edukatif, sesuai brand voice.

**Rekomendasi:** Tambahkan label visual "⚡ Cepat & Murah" / "🔥 Kualitas Premium" sesuai marketing context untuk menguatkan diferensiasi tier.

---

## FILE 2: `app/compare-models/page.tsx` (177 lines)

### 1. Code Quality: ⭐⭐⭐ (Cukup)
- **Type safety:** `FormEvent`, `useState<Array<"basic"|"pro"|"ultra">>`, `ComparisonSessionResponse` — typed dengan baik.
- **Loading state:** Status `loading` di-handle ("Memuat..."), `session.status` polling dengan `queued`/`processing`.
- **Error handling:** `error` state ditampilkan di UI, catch block di `handleSubmit`.
- **Concern:** Tidak ada abort controller untuk fetch. Polling interval jalan terus walau komponen unmount (sampai next render). Sudah di-clear di cleanup — OK.
- **Minor:** `getModelCatalog().catch(() => undefined)` — error handling silent, tidak user-facing. OK karena hanya untuk dynamic tier selection.

### 2. Fitur vs Marketing: ⭐⭐⭐⭐⭐ (Sangat Sesuai)
- Product context baris 55: "Multi-model comparison: generate same brief with different AI styles".
- Komponen ini langsung menjawab: input brief → pilih tiers → bandingkan hasil side-by-side. Share link (`share_slug`) juga ada untuk social proof.
- PostHog tracking lengkap: `compare_models_started`, `compare_models_completed`, `comparison_shared`.

### 3. Bug / Incomplete:
- **Incomplete:** `tiers` default hardcoded ke `["basic", "pro", "ultra"]`. Saat model catalog kosong atau gagal load, tier tetap default — tapi user tetap bisa submit. Bisa mengakibatkan request tier yang tidak tersedia.
- **Minor UX:** Ketika `tiers.length === 0`, tombol disabled — tapi tidak ada pesan kenapa disabled.
- Tiers dari model catalog difilter ke `accessible` saja — bagus.

### 4. Brand Voice ID: ⭐⭐⭐ (Mixed)
- Header: "Bandingkan hasil dari beberapa model AI" — baik.
- Deskripsi: "Tulis satu brief, lalu lihat hasil `Basic`, `Pro`, dan `Ultra` berdampingan tanpa perlu mengulang prompt manual satu per satu." → tone friendly tapi agak teknis ("prompt manual").
- Tombol: "Mulai comparison" → **campuran EN-ID**. Seharusnya "Mulai Bandingkan" atau "Bandingkan Sekarang".
- Placeholder textarea: "Contoh: Buat poster promo minuman boba..." → ID baik.
- "Menyiapkan comparison..." → **EN-ID mixed**, seharusnya "Menyiapkan perbandingan..."

**Rekomendasi:** Ganti semua teks EN menjadi ID: "Mulai comparison" → "Mulai Bandingkan", "Compare Models" → "Bandingkan Model", "Menyiapkan comparison" → "Menyiapkan perbandingan", "Aspect ratio" → "Rasio Aspek".

---

## FILE 3: `app/compare-models/[slug]/page.tsx` (39 lines)

### 1. Code Quality: ⭐⭐⭐⭐ (Baik)
- **Type safety:** `useParams<{ slug: string }>()` — typed.
- **Loading state:** Tidak ada explicit loading indicator (data langsung di-fetch). **Gap:** saat fetching berlangsung, UI kosong (tidak ada spinner/skeleton).
- **Error handling:** `error` state + `mounted` guard — baik.
- **Cleanup:** cleanup function untuk `mounted = false` — baik.

### 2. Fitur vs Marketing: ⭐⭐⭐⭐⭐ (Sesuai)
- Share link comparison — sesuai dengan product context untuk social proof.

### 3. Bug:
- **Bug:** Tidak ada loading state. Saat `getSharedComparisonSession` berjalan (async), user melihat halaman kosong tanpa indikasi loading. Seharusnya ada spinner/skeleton.
- `readOnly={true}` di-pass ke `ComparisonResults` — share tidak bisa di-share ulang dari halaman share (by design? OK tapi perlu konfirmasi).

### 4. Brand Voice ID: ⭐⭐⭐ (Mixed)
- "Shared comparison tidak ditemukan." → EN-ID mixed. Seharusnya "Perbandingan yang dibagikan tidak ditemukan."

**Rekomendasi:** (1) Tambahkan loading state. (2) Ganti error message ke full ID.

---

## FILE 4: `components/compare/ComparisonResults.tsx` (72 lines)

### 1. Code Quality: ⭐⭐⭐⭐ (Baik)
- **Type safety:** Props typed, `ComparisonSessionResponse` imported.
- **Loading/empty:** `variant.result_url` null → dashed border placeholder. `variant.status === "failed"` → error message.
- **Image:** `unoptimized` pada `next/image` — OK untuk external URLs.
- **Minor:** Tidak ada skeleton loading saat initial load.

### 2. Fitur vs Marketing: Sesuai, komponen presentasi hasil comparison.

### 3. Bug: Tidak ada.

### 4. Brand Voice ID: ⭐⭐⭐ (Mixed)
- "Comparison Session" → EN
- "Bandingkan model untuk brief yang sama" → ID baik
- "Status:", "Perkiraan biaya ... kredit" → mixed tapi acceptable
- "Bagikan hasil" → ID baik
- "Varian ini gagal diproses." / "Variant sedang diproses..." → mixed EN-ID

**Rekomendasi:** "Variant" → "Varian", "Comparison Session" → "Sesi Perbandingan".

---

## FILE 5: `app/LandingPageClient.tsx` (701 lines)

### 1. Code Quality: ⭐⭐⭐ (Cukup)
- **Type safety:** `WaitlistJoinResult` typed, `landingVariant` typed. Tapi banyak data array inline tanpa type annotation.
- **Error handling:** Waitlist error di-handle (network error, HTTP error, validation).
- **Loading state:** `waitlistLoading` untuk form, spinner di tombol.
- **Concern:** `API_BASE_URL` hardcoded fallback ke `localhost:8000` — seharusnya production-ready env var wajib di-set. Bisa jadi security risk di production.
- **Technical debt:** 700+ lines dalam satu file — sangat besar. Seharusnya dipecah ke komponen-komponen terpisah.

### 2. Fitur vs Marketing: ⭐⭐⭐⭐⭐ (Sangat Sesuai)
Landing page ini adalah **gold standard** untuk alignment dengan product context:

- **Hero:** "AI Terbaik Minggu Ini, Minggu Depan, dan Seterusnya. Kamu Tinggal Cerita — Kami yang Bikin Desainnya." → tepat mencerminkan positioning "OpenRouter for UMKM design" (baris 29).
- **"Kenapa AI Chatbot Tidak Cukup":** Comparison table AI Chatbot vs SmartDesign → mencerminkan counter-positioning di baris 31-32: "Our real competition is not Canva — it's the friction between UMKM and the AI model landscape."
- **5 Langkah (Cara Kerja):** "Ceritakan → AI Interview → Pilih Model AI → Generate → Edit & Download" → sesuai dengan Guided Workflow di baris 96-112.
- **Marketplace strip:** Shopee, Tokopedia, TikTok Shop, Facebook Ads → presisi market Indonesia (baris 171-172).
- **Objection handling:** "Kami Sudah Antisipasi Pertanyaanmu" → 6 objections sesuai baris 218-226.
- **Waitlist:** Footer waitlist dengan social proof count → sesuai goals baris 326-337.
- **Pricing:** PricingSection dan FAQSection di-render → sesuai.

### 3. Bug:
- **SEO gap:** `jsonLD` di-render via `dangerouslySetInnerHTML` di dalam `"use client"` component. Google bisa membaca JS-rendered content, tapi `metadata` di `page.tsx` (server component) sudah benar. Tidak bug serius.
- **Mobile menu:** Link anchor `#features`, `#how-it-works`, `#pricing` — perlu dipastikan ID-nya ada. Di code, `features` ada di baris 410, `how-it-works` di 321, `pricing` di PricingSection (terpisah). OK.
- **Social links:** `href="#"` — placeholder, belum diisi. Tidak bug tapi incomplete.

### 4. Brand Voice ID: ⭐⭐⭐⭐⭐ (Excellent)
- "Kamu" bukan "Anda" — sesuai brand voice baris 282.
- Conversational: "Mungkin Kamu Mikir...", "Kami Sudah Antisipasi Pertanyaanmu"
- Jargon-free: hindari "prompt engineering", "machine learning", "wrapper" — tepat sesuai "Words to avoid" (baris 265).
- Transparan: "Hasil AI-nya tidak sesuai ekspektasi..." → "Ada AI Interview sebelum generate — kamu lihat preview-nya dulu. Tidak cocok? Revisi. Tidak pakai kredit." → sesuai brand voice "jujur" (baris 282).
- Smart-but-not-pretentious: "AI chatbot kasih kamu mesin. SmartDesign kasih kamu seluruh bengkel." (baris 303).

**Rekomendasi:** (1) Pecah ke komponen terpisah. (2) Isi social media links. (3) Fix `localhost` fallback.

---

## FILE 6: `app/page.tsx` (36 lines)

### 1. Code Quality: ⭐⭐⭐⭐ (Baik)
- Server component wrapping client component dengan `Suspense` — best practice. Metadata typed.

### 2. Fitur vs Marketing: N/A (hanya wrapper)

### 3. Bug: Tidak ada.

### 4. Brand Voice ID: Metadata dalam ID — baik. "Multi-Model AI untuk Desain UMKM" sesuai.

---

## FILE 7: `app/create/page.tsx` (749 lines)

### 1. Code Quality: ⭐⭐ (Perlu Perbaikan)
- **Type safety:** `useCreateDesign()` mengembalikan banyak state — typed via hook return type. Tapi props drilling sangat dalam (>30 props ke `SidebarInputForm`).
- **Loading state:** Spinner saat auth loading, `isParsing`, `isSaving`, `isGeneratingImage` — semua di-handle.
- **Error handling:** `ErrorModal`, `InlineErrorBanner`, toast notifications — comprehensive.
- **Concern serius:** File terlalu besar (749 lines). Mixing routing logic (`CreatePageContent`, `CreatePageFallback`, `LegacyCreatePage`), intent-first flow, legacy flow. **High cognitive load.**
- **Dead code risk:** `LegacyCreatePage` digunakan sebagai fallback saat `INTENT_FIRST_ENTRY_ENABLED=false` atau `?legacy=1`. Apakah legacy flow masih perlu dipertahankan? Jika iya, seharusnya di-extract ke file terpisah.
- **`eslint-disable`:** Line 293-294 dan 314-315 menggunakan `@typescript-eslint/no-explicit-any` — menunjukkan type gap di `onModifyPromptParts`.

### 2. Fitur vs Marketing:
- Intent-first flow: "Apa tujuan desain Anda hari ini?" → "Buat Iklan dari Foto", "Rapikan Foto Produk", "Buat Konten dari Teks" + "Opsi Lanjutan" (Carousel Instagram).
- Ini sesuai dengan 5-step create flow (baris 194): Input → AI Interview → Model Selection → Generate → Preview & Editor.
- Namun flow "AI Interview" di marketing (baris 98) adalah interview 3-4 pertanyaan oleh AI. Di code, interview di-render oleh `DesignBriefInterview` component, terpisah. Legacy flow tidak punya interview.

### 3. Bug / Incomplete:
- **Incomplete:** Route `/create` sekarang redirect ke `/start` (baris 711). Ini berarti LegacyCreatePage hanya bisa diakses via `?legacy=1`. Apakah transisi ini sudah selesai? Jika belum ada user di legacy flow, ini OK. Tapi jika ada user regular, redirect-breaking bisa membingungkan.
- **Missing:** `BrandSwitcher` di-render tapi tidak jelas apakah berfungsi penuh — perlu dicek integrasi dengan brand kit API.

### 4. Brand Voice ID: ⭐⭐⭐⭐ (Baik)
- "Apa tujuan desain Anda hari ini?" — pakai "Anda" (lebih formal), berbeda dengan landing page ("Kamu"). **Ketidakkonsistenan:** landing pakai "Kamu", create flow pakai "Anda". Brand voice menyebut "pakai 'kamu' bukan 'Anda'" (baris 282).
- "AI Sedang Fokus 👀" — friendly, emoji.
- "Menganalisis deskripsi Anda..." — formal.
- "Buka panel kiri jika ingin mengubah brief atau pengaturan hasil." — tone helpful.

**Rekomendasi:** (1) Refactor ke file lebih kecil. (2) Konsistenkan "Kamu" vs "Anda" — prefer "Kamu" sesuai brand voice. (3) Remove `any` types. (4) Evaluasi apakah legacy route masih diperlukan.

---

## FILE 8: `app/start/page.tsx` (243 lines)

### 1. Code Quality: ⭐⭐⭐⭐ (Baik)
- **Type safety:** `ProjectSummary` interface, `useSession()` typed, `useState<ProjectSummary[]>`.
- **Loading state:** `status === "loading"` → spinner. `loadingProjects` → "Memuat proyek terbaru..." text + spinner.
- **Error handling:** `try/catch` di `loadProjects` dengan console.error. **Gap:** Error tidak ditampilkan ke user — silently fail.
- **Empty state:** "Belum ada proyek yang tersimpan. Mulai dari jalur desain baru..." — baik.
- **Cleanup:** `mounted` flag di useEffect.

### 2. Fitur vs Marketing: ⭐⭐⭐⭐ (Sesuai)
- Start hub sebagai entry point untuk "Apa yang ingin Anda buat hari ini?" — sesuai dengan guided workflow.
- Dua kategori utama: "Buat Desain Promosi" (→ `/design/new/interview`) dan "Edit Foto Produk" (→ `/tools`).
- Quick tools section dengan `Compare Models` link.
- Recent projects untuk "Lanjutkan pekerjaan terakhir" — memenuhi "Brand Kit creation and management across projects" (baris 54).

### 3. Bug:
- **Feature flag gate:** `START_HUB_ENABLED` → redirect ke `/create?legacy=1` jika false. Aman.
- **Minor:** `featuredToolItems` di-render dengan `<tool.Icon>` — ini dynamic component, perlu dipastikan rendering tidak error.

### 4. Brand Voice ID: ⭐⭐⭐ (Mixed)
- "Apa yang ingin Anda buat hari ini?" → "Anda" bukan "Kamu". **Tidak konsisten** dengan brand voice.
- "Library" di AppHeader link → EN. Seharusnya "Pustaka" atau "Koleksi".
- "Quick tools" → EN. "Akses cepat ke alat edit foto yang sering digunakan." → mixed.
- "Compare Models" → EN. Seharusnya "Bandingkan Model".
- "Mulai Jalur Desain" → baik.
- "Lanjutkan pekerjaan terakhir" → baik.

**Rekomendasi:** (1) "Anda" → "Kamu" untuk konsistensi brand voice. (2) "Quick tools" → "Alat Cepat". (3) "Library" → "Pustaka". (4) "Compare Models" → "Bandingkan Model".

---

## FILE 9: `app/layout.tsx` (66 lines)

### 1. Code Quality: ⭐⭐⭐⭐ (Baik)
- Server component, `Metadata` typed, `lang="id"` — baik untuk SEO.
- Font loading dari Google Fonts (11 families!). **Performance concern:** 11 font families di-load sekaligus — sangat berat.
- `Toaster` di luar `AuthProvider` — OK.
- `DeploymentGuard` dan `WhatsAppButton` di root.

### 2. Fitur vs Marketing: Sesuai.

### 3. Bug: Tidak ada.

### 4. Brand Voice ID: ⭐⭐⭐⭐⭐ (Baik)
- `html lang="id"` — tepat.
- Open graph dan twitter metadata dalam ID.

**Rekomendasi:** Kurangi jumlah Google Font families — 11 terlalu banyak. Hanya load yang benar-benar dipakai.

---

## FILE 10: `app/vs/[slug]/page.tsx` (80 lines)

### 1. Code Quality: ⭐⭐⭐⭐⭐ (Excellent)
- **Server component** — tidak ada `"use client"`. Metadata async dengan `generateMetadata`.
- **Type safety:** `params: Promise<{ slug: string }>` — Next.js 15 pattern.
- **Fallback:** `CONTENT[slug] || CONTENT["gpt-image"]` — default ke GPT Image jika slug tidak dikenal.
- **Static content:** Semua konten hardcoded di `CONTENT` object — tidak ada fetch runtime.

### 2. Fitur vs Marketing: ⭐⭐⭐⭐ (Sesuai)
- Positioning "SmartDesign vs GPT Image / Canva / ChatGPT" — tepat untuk SEO comparison pages.
- Tapi semua konten statis — tidak dinamis dari API. Untuk 3 halaman ini OK, tapi jika mau scale perlu CMS.

### 3. Bug:
- **Missing:** Tidak ada `loading.tsx` atau suspense boundary. Untuk server component kecil ini OK.
- **Canonical:** `alternates: { canonical: '/vs/${slug}' }` tanpa full URL. Metadata base di layout sudah di-set ke `https://smartdesign.id`, jadi OK.

### 4. Brand Voice ID: ⭐⭐⭐⭐ (Baik)
- Deskripsi ID baik: "GPT Image kuat untuk output tunggal, tetapi SmartDesign menambahkan workflow..."
- Bullets: "Bandingkan model tanpa menulis ulang prompt." — "prompt" adalah kata yang di-marketing dihindari (baris 265: "Words to avoid: prompt engineering"). Tapi "prompt" sendiri mungkin acceptable sebagai istilah umum.
- CTA: "Buka Compare Models", "Kembali ke Landing" → mixed EN-ID.

**Rekomendasi:** (1) "prompt" → "teks masukan" atau "perintah" jika ingin strict brand voice. (2) "Compare Models" → "Bandingkan Model". "Landing" → "Beranda".

---

## FILE 11: `components/create/SidebarInputForm.tsx` (302 lines)

### 1. Code Quality: ⭐⭐ (Perlu Perbaikan)
- **Prop drilling parah:** 30+ props! Ini adalah antipattern. Seharusnya menggunakan context atau composition.
- **Type safety:** Props typed dengan `SidebarInputFormProps` — OK.
- **Conditional rendering:** Banyak percabangan (`isIntentFlow`, `isGenerateMode`, `userIntent`, etc.) — sulit dibaca.

### 2. Fitur vs Marketing: N/A (komponen pembantu)

### 3. Bug: Tidak ada bug jelas, tapi kompleksitas tinggi meningkatkan risiko.

### 4. Brand Voice ID: ⭐⭐⭐ (Mixed)
- "Flow Aktif" — baik.
- "1. Tujuan", "2. Brief", "3. Hasil" — baik.
- "Buat dari Brief", "Ubah dari Foto" — baik.
- "Tingkat Perubahan" — baik.
- Beberapa teks tetap mixed: "overrideable", dll.

**Rekomendasi:** Refactor dengan React Context untuk create flow state.

---

## FILE 12: `app/design/new/interview/page.tsx` (683 lines)

### 1. Code Quality: ⭐⭐⭐ (Cukup)
- **Large file:** 683 lines. Multi-step interview dengan form handling, upload, catalog planning dalam satu file.
- **Type safety:** Semua state typed. `useMemo` untuk progress.
- **Loading states:** `isUploading`, `isCatalogPlanning` dengan spinner.
- **Error handling:** `uploadError`, `catalogPlanningError` — baik.
- **Cleanup:** Blob URL revocation — baik.
- **Concern:** Catalog planning flow (baris 205-269) sangat kompleks — 5 API calls sequential. Jika salah satu gagal, tidak ada partial save. Seluruh flow harus diulang.

### 2. Fitur vs Marketing: ⭐⭐⭐⭐ (Sesuai)
- "Mulai dari brief visual, bukan panel samping" — ini adalah interview page untuk brief.
- Progress bar: 5 langkah (tujuan, produk, gaya, channel, tone) → sesuai 5-step create flow.
- Upload foto produk — sesuai persona UMKM.

### 3. Bug / Incomplete:
- **Missing:** "Skip" button di baris 670 memungkinkan user skip semua fields → default values di-hardcode (goal="promo", product="Makanan & Minuman", style="Minimal clean", etc). Apakah ini UX yang diinginkan? Mungkin perlu konfirmasi.
- **Performance:** Catalog planning sequential 5 API calls — bisa lambat. Perlu parallelization untuk `planCatalogStructure` dan `suggestCatalogStyles`.

### 4. Brand Voice ID: ⭐⭐⭐ (Mixed)
- "Jalur desain baru" — baik.
- "Progress brief" — mixed.
- "Goal" → EN. "Product Type" → EN. "Style" → EN. "Channel" → EN. "Copy Tone" → EN.
- "Catalog type" → EN.
- "Skip" → EN.

**Rekomendasi:** (1) EN labels → ID: "Goal" → "Tujuan", "Product Type" → "Jenis Produk", "Style" → "Gaya Visual", "Channel" → "Platform", "Copy Tone" → "Nada Teks", "Skip" → "Lewati". (2) Pertimbangkan paralelisasi catalog API calls.

---

## FILE 13: `app/design/new/preview/page.tsx` (964 lines)

### 1. Code Quality: ⭐⭐ (Perlu Perbaikan Serius)
- **Sangat besar:** 964 lines — file terbesar yang diaudit. Preview + generation + catalog render + gallery dalam 1 file.
- **Kompleksitas tinggi:** Banyak `useState`, `useEffect`, conditional rendering, form handling.
- **Polling loop:** Generation polling di baris 449-454 (max 180 attempts × 2 detik = 6 menit max). Bisa UX buruk jika gagal.
- **Cleanup:** Blob URL, animation frame — baik.

### 2. Fitur vs Marketing: ⭐⭐⭐⭐ (Sesuai)
- Preview brief sebelum generate — baik.
- Generate ke editor — baik.
- Catalog rendering — sesuai.

### 3. Bug:
- **Bug:** Jika `PREVIEW_REAL_GENERATION_ENABLED=false`, redirect ke legacy engine (baris 327-329). Tapi tidak ada fallback yang handles jika `generateDesign` API tidak tersedia.
- **Race condition risk:** `handleGenerate` bisa dipanggil multiple times jika user double-click. Button disabled via `isWorking` — OK.
- **Missing:** Tidak ada abort mechanism untuk polling loop.

### 4. Brand Voice ID: ⭐⭐⭐ (Mixed)
- "Brief siap di-generate" → mixed EN-ID.
- "Ringkasan brief" → OK.
- "Goal", "Product Type", "Style", "Channel", "Copy Tone" → EN labels seperti di interview page.
- "Download semua halaman (ZIP)" → OK.
- "Buka di editor" → OK.
- "Ubah Brief", "Pakai engine lama" → OK.

**Rekomendasi:** (1) Refactor besar-besaran — pisahkan catalog, preview, dan generation logic. (2) EN labels → ID seperti interview page.

---

## FILE 14: `components/layout/AppHeader.tsx` (228 lines)

### 1. Code Quality: ⭐⭐⭐⭐ (Baik)
- **Type safety:** Props typed, `usePathname()` typed.
- **UX details:** Hover delay untuk tools mega menu (180ms), mobile hamburger dengan animasi.
- **Accessibility:** `aria-haspopup`, `aria-expanded`, `aria-label` — baik.
- **Cleanup:** Timer cleanup — baik.

### 2. Fitur vs Marketing: Sesuai — navigasi utama.

### 3. Bug:
- **Minor:** Mega menu position absolute — bisa overflow di viewport kecil. Perlu cek di laptop 13".
- Mobile menu: semua tool items di-render dalam 1 list panjang — untuk 8 tools ini OK.

### 4. Brand Voice ID: ⭐⭐ (Perlu Banyak Perbaikan)
- "Mulai" — baik.
- "Library" → EN, seharusnya "Pustaka".
- "Brand Kit" → EN (tapi sudah umum).
- "AI Tools" → EN, seharusnya "Alat AI".
- Tool section titles: "Alat Cepat" — baik. "Fitur Spesial" — baik.
- Tool names sudah ID: "Ganti Latar Foto", "Percantik Foto", "Hapus Objek", "Pasang Logo / Watermark", "Ubah Suasana Foto", "Proses Katalog Foto", "Buat Pas Foto", "Edit Otomatis (Pro)" — **excellent**.
- Badge: "TOP", "BARU" — mixed EN-ID tapi badge biasanya universal.

**Rekomendasi:** (1) "Library" → "Pustaka". (2) "AI Tools" → "Alat AI". (3) Cek mega menu overflow.

---

## FILE 15: `lib/api/types.ts` (820 lines)

### 1. Code Quality: ⭐⭐⭐⭐⭐ (Excellent)
- Comprehensive type definitions. Semua interface typed dengan baik.
- `ModelTier`, `ModelCatalogItem`, `ComparisonSessionResponse`, `ComparisonVariant` — semua typed.

### 2. Fitur vs Marketing: N/A (shared types)

### 3. Bug: Tidak ada.

### 4. Brand Voice ID: N/A (code types)

---

## FILE 16: `lib/feature-flags.ts` (46 lines)

### 1. Code Quality: ⭐⭐⭐⭐ (Baik)
- Simple env var reading. Default `"true"` untuk semua flag.

### 2. Fitur: Sesuai untuk feature rollout.

### 3. Bug: Tidak ada.

---

## FILE 17: `lib/tool-catalog.ts` (57 lines)

### 1. Code Quality: ⭐⭐⭐⭐⭐ (Excellent)
- Clean, well-structured. `ToolMenuItem`, `ToolSection` interfaces.
- `featuredToolItems`, `allToolItems` — convenient exports.

### 2. Brand Voice ID: ⭐⭐⭐⭐⭐ (Excellent)
- Semua tool names dalam Bahasa Indonesia yang baik.
- "Alat Cepat", "Fitur Spesial" — tepat.

---

## RINGKASAN & REKOMENDASI PRIORITAS

### 🔴 Critical Issues (Harus Diperbaiki)

| # | File | Issue |
|---|------|-------|
| 1 | `create/page.tsx` | File 749 lines — harus di-refactor. Legacy flow mixing dengan new flow. |
| 2 | `design/new/preview/page.tsx` | File 964 lines — harus di-refactor. Terlalu kompleks. |
| 3 | `LandingPageClient.tsx` | `localhost:8000` fallback di production — security risk. |
| 4 | `SidebarInputForm.tsx` | 30+ props drilling — gunakan React Context. |

### 🟡 Brand Voice Inconsistency (Harus Diperbaiki)

| # | Pattern | Found In | Fix |
|---|---------|----------|-----|
| 1 | "Anda" vs "Kamu" | create pages, start page, interview, preview | Gunakan "Kamu" (sesuai brand voice baris 282) |
| 2 | "Compare Models" | compare-models, start, AppHeader, vs pages | "Bandingkan Model" |
| 3 | "Library" | AppHeader, start | "Pustaka" |
| 4 | "AI Tools" | AppHeader | "Alat AI" |
| 5 | "Goal" / "Product Type" / "Style" / "Channel" / "Copy Tone" | interview, preview | "Tujuan" / "Jenis Produk" / "Gaya Visual" / "Platform" / "Nada Teks" |
| 6 | "comparison" | compare-models page | "perbandingan" |
| 7 | "Aspect ratio" | compare-models page | "Rasio Aspek" |
| 8 | "Quick tools" | start page | "Alat Cepat" |

### 🟢 Positive Findings

- **LandingPageClient:** Brand voice excellent — menjadi benchmark untuk halaman lain.
- **ModelSelector:** Implementation solid, type-safe, accessible.
- **tool-catalog.ts:** Semua dalam Bahasa Indonesia, clean code.
- **vs/[slug]/page.tsx:** Clean server component pattern.
- **PostHog analytics:** Comprehensive tracking di semua flow.
- **Error handling pattern:** Konsisten menggunakan `InlineErrorBanner` + `ErrorModal`.

### 📊 Overall Scores

| Category | Score | Notes |
|----------|-------|-------|
| Code Quality | 6/10 | File terlalu besar, prop drilling, minor type gaps |
| Type Safety | 7/10 | Kebanyakan typed, ada `any` di beberapa tempat |
| Error Handling | 7/10 | Pattern konsisten, silent failures di beberapa tempat |
| Loading States | 8/10 | Hampir semua path memiliki loading state |
| Feature-Marketing Alignment | 8/10 | Landing page gold standard, product features tercakup |
| Brand Voice ID Consistency | 5/10 | Landing page excellent, tapi halaman app banyak EN-ID mixing |
| Bug Severity | Low | Tidak ada critical runtime bug ditemukan — lebih ke incomplete/missing features |
