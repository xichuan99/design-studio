# PostHog Dashboard Spec — Landing Experiment (Phase 3A)

*Updated: 2026-05-06*

Dokumen ini berisi query dan panel minimal yang wajib ada untuk menilai eksperimen landing + compare tanpa menunggu setup ad-hoc.

---

## 1) Prasyarat Event

Pastikan event berikut sudah masuk ke PostHog:

1. `landing_viewed` dengan properti `variant`.
2. `waitlist_submitted` dengan properti `variant`, `source`, `is_new`, `position`.
3. `landing_cta_clicked` dengan properti `variant`, `cta_name`, `cta_location`.
4. `compare_models_started`.
5. `compare_models_completed`.
6. `comparison_shared`.

---

## 2) Panel Wajib (Dashboard)

### Panel A — Landing traffic by variant

Event: `landing_viewed`

Breakdown:
1. `variant`

Interval:
1. Daily

Tujuan:
1. Cek distribusi bucket per varian stabil dan tidak timpang ekstrem.

### Panel B — Waitlist conversion by variant

Funnel:
1. `landing_viewed`
2. `waitlist_submitted`

Breakdown:
1. `variant`

Attribution:
1. First touch

Tujuan:
1. Menentukan uplift conversion per varian.

### Panel C — Compare adoption

Formula:
1. `compare_models_started` / active creators (atau jumlah pengguna yang menghasilkan desain pada periode sama)

Tujuan:
1. Melihat apakah eksperimen landing mendorong adopsi fitur utama.

### Panel D — CTA click-through by variant

Event: `landing_cta_clicked`

Breakdown:
1. `variant`
2. `cta_location`

Tujuan:
1. Mengetahui varian mana yang paling efektif mendorong klik CTA sebelum submit waitlist.

### Panel E — Compare reliability

Formula:
1. `compare_models_completed` / `compare_models_started`

Guardrail target:
1. >= 80% harian

### Panel F — Share intent

Formula:
1. `comparison_shared` / `compare_models_completed`

Tujuan:
1. Proksi nilai hasil comparison bagi pengguna.

---

## 3) Alert Rules (Minimal)

1. Trigger warning jika conversion varian turun > 10% dari control selama 24 jam.
2. Trigger warning jika `compare_models_completed / compare_models_started` < 0.8 selama 6 jam.
3. Trigger critical jika endpoint `/api/compare-models/*` error rate > 5% selama 30 menit.

---

## 4) Environment Setup untuk Bucketing

Gunakan kombinasi berikut:

1. `NEXT_PUBLIC_LANDING_EXPERIMENT_VARIANT=auto`
2. `NEXT_PUBLIC_LANDING_EXPERIMENT_VARIANTS=control,hero_v2`

Catatan:
1. Jika `NEXT_PUBLIC_LANDING_EXPERIMENT_VARIANT` diisi nilai selain `auto`, sistem akan memaksa semua traffic ke varian itu (berguna untuk QA atau rollback cepat).

### QA Query Params (Opsional)

Untuk pengujian cepat di browser tanpa clear storage manual:

1. Reset assignment: `/?exp_reset=1`
2. Force variant sementara: `/?exp_reset=1&exp_variant=hero_v2`

Catatan:
1. `exp_variant` akan tersimpan sebagai assignment sticky baru pada browser tersebut.
2. Setelah selesai QA, buka `/?exp_reset=1` untuk kembali ke assignment otomatis.