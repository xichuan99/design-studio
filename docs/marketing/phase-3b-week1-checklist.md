# SmartDesign Phase 3B — Week 1 Execution Checklist

*Updated: 2026-05-06*

Checklist ini dipakai untuk mengeksekusi 7 hari pertama launch operasional setelah compare-models dan landing experiment siap dipakai.

## Day 0 (Pra-launch)

1. Validasi flag:
   - `NEXT_PUBLIC_COMPARE_MODELS_V1=true`
   - `NEXT_PUBLIC_LANDING_EXPERIMENT_VARIANT=auto`
   - `NEXT_PUBLIC_LANDING_EXPERIMENT_VARIANTS=control,hero_v2`
2. Verifikasi event tracking masuk:
   - `landing_viewed`
   - `landing_cta_clicked`
   - `waitlist_submitted`
   - `compare_models_started`
   - `compare_models_completed`
3. Cek endpoint health:
   - `/api/models`
   - `/api/waitlist/count`
   - `/api/compare-models/*`
4. Pastikan owner on-call dan channel incident aktif.

## Day 1

1. Catat baseline funnel:
   - visitor landing
   - waitlist submitted
   - compare started
   - compare completed
2. Cek guardrails harian (error rate, completion reliability, refund anomaly).
3. Simpan snapshot metrik pertama ke dokumen operasi mingguan.

## Day 2

1. Audit kualitas data varian experiment (distribusi control vs hero_v2).
2. Review feedback user awal dari support/channel internal.
3. Tetapkan aksi kecil jika ada friksi onboarding.

## Day 3

1. Mid-week check untuk:
   - conversion gap antar varian
   - performa compare-models per tier
2. Jika ada guardrail yellow > 60 menit, aktifkan review cepat lintas tim.

## Day 4

1. Review cohort pengguna baru (day-1 retention proksi sederhana).
2. Cek stabilitas API dan latensi P95 compare session.
3. Susun kandidat keputusan: lanjut eksperimen atau hold.

## Day 5

1. Finalisasi insight awal experiment.
2. Klasifikasikan varian: winning, neutral, losing.
3. Tentukan action akhir minggu (promote, iterate, rollback).

## Day 6

1. Validasi ulang perubahan yang akan dibawa ke minggu 2.
2. Pastikan tidak ada regresi pada event atau endpoint utama.

## Day 7 (Weekly Decision)

1. Weekly review lintas Product, Engineering, Data.
2. Keputusan resmi minggu berikutnya:
   - lanjut dengan konfigurasi sekarang, atau
   - promote varian pemenang, atau
   - rollback fitur/varian bermasalah.
3. Tutup minggu dengan ringkasan:
   - apa yang berubah
   - dampak pada conversion
   - risiko tersisa

## Format Ringkas Snapshot Harian

Gunakan format ini untuk logging cepat tiap hari:

- Date:
- Landing visitors:
- Waitlist submitted:
- Compare started:
- Compare completed:
- Compare fail rate:
- P95 compare latency:
- Refund anomaly rate:
- Decision: continue | hold | rollback
- Notes:
