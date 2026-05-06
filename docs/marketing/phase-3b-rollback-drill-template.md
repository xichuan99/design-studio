# SmartDesign Phase 3B — Rollback Drill Template

*Updated: 2026-05-06*

Template ini dipakai untuk simulasi rollback dan dokumentasi insiden nyata agar proses rollback konsisten, cepat, dan dapat diaudit.

## 1) Drill Metadata

- Drill date:
- Drill type: simulation | real incident
- Incident commander:
- Participants:
- Trigger source: alert | manual observation | user report

## 2) Trigger Condition

Isi metrik yang memicu rollback:

- API error rate (`/api/compare-models/*`):
- Compare completion reliability:
- Compare fail rate:
- Refund anomaly rate:
- Impacted user segment:

## 3) Timeline (Wajib Timestamp)

1. Detection time:
2. Triage start:
3. Rollback decision:
4. Flag changed:
5. Verification complete:
6. User communication sent:
7. Incident closed:

## 4) Rollback Actions

Checklist tindakan:

1. Set `NEXT_PUBLIC_COMPARE_MODELS_V1=false`.
2. Verify compare entry hilang dari flow `/start`.
3. Validasi fallback route bekerja.
4. Umumkan status di channel internal.
5. Freeze release terkait sampai RCA selesai.

## 5) Verification After Rollback

- Error rate turun ke bawah threshold:
- Conversion path utama (landing -> waitlist/signup) normal:
- Credit/refund anomaly kembali normal:
- Tidak ada regression baru terdeteksi:

## 6) Root Cause Analysis Ringkas

- Summary akar masalah:
- Komponen terdampak:
- Mengapa guardrail tidak mencegah lebih awal:
- Perbaikan permanen yang disepakati:

## 7) Action Items

1. [ ] Tambah/ubah alert
2. [ ] Tambah test coverage
3. [ ] Perbaiki playbook
4. [ ] Jadwalkan re-launch bertahap

## 8) Sign-off

- Product owner:
- Engineering owner:
- Data owner:
- Sign-off date:
