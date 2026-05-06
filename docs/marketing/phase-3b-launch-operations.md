# SmartDesign Phase 3B — Launch Operations Playbook

*Updated: 2026-05-06*

Dokumen ini melengkapi `product-alignment-plan.md` dengan eksekusi operasional setelah fitur Phase 0-2 live. Fokusnya bukan lagi build fitur inti, tapi **menjaga kualitas launch**, **mengamankan conversion path**, dan **mengontrol risiko bisnis** secara harian.

Dokumen pendukung:
1. `phase-3b-week1-checklist.md` untuk checklist eksekusi 7 hari pertama.
2. `phase-3b-rollback-drill-template.md` untuk simulasi/insiden rollback.

---

## 1) Objective Phase 3B

1. Menjalankan eksperimen terstruktur pada landing + compare flow.
2. Menjaga guardrail agar traffic naik tidak merusak activation, kredit, atau latensi.
3. Menyediakan prosedur rollback cepat untuk insiden conversion atau quality regressions.

---

## 2) Scope Operasional

### In scope
1. Landing headline/CTA experiment management.
2. Compare-models adoption monitoring (`compare_models_started`, `compare_models_completed`, `comparison_shared`).
3. Waitlist to signup funnel monitoring.
4. Incident response untuk error spike pada generation/comparison.

### Out of scope
1. Pengembangan fitur marketplace integrations.
2. Perubahan pricing plan besar.
3. Inisiatif ecosystem jangka panjang (referral/community) selain persiapan metrik awal.

---

## 3) Success Metrics dan Guardrails

### North-star operasional
1. Waitlist submit rate (landing visitor -> `waitlist_submitted`).
2. Compare adoption rate (`compare_models_started` / active creators).
3. Compare completion reliability (`compare_models_completed` / `compare_models_started`).

### Guardrails wajib
1. `compare_models_failed_rate` < 20% harian.
2. P95 waktu selesai comparison <= 180 detik.
3. Refund anomaly (refund kredit comparison / total charged) <= 25%.
4. API error rate endpoint baru (`/api/compare-models/*`) <= 2%.

Jika satu guardrail terlewati selama > 60 menit, masuk status *yellow*. Jika > 3 jam atau berdampak funnel utama, status *red* dan rollback dipertimbangkan.

---

## 4) Eksperimen Runbook (Landing + Compare)

### Step A — Proposal
1. Definisikan hipotesis dan metrik utama.
2. Tetapkan target uplift minimum (contoh: +10% waitlist submit rate).
3. Tentukan durasi minimum: 7 hari atau minimal 500 sesi per varian.

### Step B — Setup
1. Set `NEXT_PUBLIC_LANDING_EXPERIMENT_VARIANT=auto` untuk mode bucketing sticky.
2. Set `NEXT_PUBLIC_LANDING_EXPERIMENT_VARIANTS` (contoh: `control,hero_v2`).
3. Gunakan override nilai tunggal (`control` atau `hero_v2`) jika perlu force variant untuk QA/rollback.
4. Pastikan event `landing_viewed` dan `waitlist_submitted` membawa properti `variant`.
5. Verifikasi dashboard event sebelum eksperimen diumumkan.

Referensi setup dashboard/query: `docs/marketing/posthog-experiment-dashboard.md`.

### Step C — Monitoring harian
1. Cek conversion varian tiap pagi (WIB).
2. Cek guardrails (error rate, completion reliability, refund anomaly).
3. Catat keputusan harian: lanjut, hold, atau rollback.

### Step D — Decision
1. Promote winner jika uplift konsisten dan guardrails aman.
2. Abort eksperimen jika guardrail red atau varian menurunkan activation > 10%.

---

## 5) Incident & Rollback Procedure

### Trigger rollback cepat
1. `/compare-models` error rate > 5% selama 30 menit.
2. Completion reliability turun di bawah 60% selama 1 jam.
3. Keluhan pengguna terkait kredit/refund meningkat signifikan.

### Langkah rollback
1. Set `NEXT_PUBLIC_COMPARE_MODELS_V1=false` untuk menonaktifkan entry compare di frontend.
2. Redirect traffic compare ke `/start` (sudah ada guard di halaman).
3. Umumkan status incident di channel internal + catat waktu rollback.
4. Lanjutkan root-cause analysis sebelum re-enable.

### Post-incident checklist
1. Dokumentasikan akar masalah + dampak funnel.
2. Tambah alert/tes untuk mencegah pengulangan.
3. Jalankan re-launch terbatas (staged enable) sebelum full rollout.

---

## 6) Weekly Cadence

1. Senin: review metrik minggu lalu dan putuskan eksperimen baru.
2. Rabu: quality checkpoint (API health, credits, completion).
3. Jumat: release decision dan backlog prioritas minggu berikutnya.

Owner minimum per minggu:
1. Product/Marketing owner (hypothesis & decision).
2. Engineering owner (implementation health).
3. Data owner (metric integrity).

---

## 7) Phase 3B Exit Criteria

Phase 3B dianggap selesai jika:
1. 2 siklus eksperimen landing selesai dengan dokumentasi keputusan.
2. Compare-models stabil selama 14 hari berturut-turut pada guardrails.
3. Incident playbook diuji minimal 1 kali simulasi rollback.
4. Backlog Phase 4 sudah diprioritaskan berbasis data funnel nyata.