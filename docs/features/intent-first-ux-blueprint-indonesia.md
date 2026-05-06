---
title: Intent-First UX Blueprint (Indonesia)
version: 1.0
date: 2026-04-12
status: Proposed
owner: Product + Design + Frontend + Backend
---

# Intent-First UX Blueprint for Design Studio

Dokumen ini dibuat untuk menjawab pertanyaan: apakah semua kemungkinan user bisa diakomodasi tanpa membuat aplikasi terasa teknis.

Jawaban: bisa, dengan strategi intent-first (tujuan user dulu), tool-second (alat dipilih sistem).

---

## 1. Prinsip Produk (Wajib)

1. User menyatakan tujuan, bukan memilih alat.
2. Sistem yang mengorkestrasi urutan tools di belakang layar.
3. Output intermediate (contoh: remove background) tidak boleh menjadi dead-end.
4. Setiap step harus punya next action yang jelas.
5. Pemula melihat alur sederhana; power user bisa membuka opsi lanjutan.

---

## 2. Tiga Entry Point Utama (MVP)

1. Buat Iklan dari Foto
2. Rapikan Foto Produk
3. Buat Konten dari Teks

Catatan:
- Entry point ini menutup mayoritas kebutuhan awal UMKM/seller.
- Semua AI tools lain tetap ada, tapi diposisikan sebagai advanced actions.

---

## 3. Intent Router (Decision Layer)

### 3.1 Input yang dibaca router
- Ada foto atau tidak
- Prompt user (bahasa natural)
- Panjang prompt
- Kata kunci niat: iklan, poster, promo, rapikan, hapus background, feed, carousel
- Konteks mode saat ini: create/editor/ai-tools

### 3.2 Hasil router
- primaryIntent
- secondaryIntent (opsional)
- confidence (0.0 - 1.0)
- recommendedFlow

### 3.3 Aturan confidence
- confidence >= 0.70: jalankan flow otomatis
- 0.40 <= confidence < 0.70: tampilkan intent chooser 2-3 opsi
- confidence < 0.40: fallback ke guided wizard (tanya 1 pertanyaan penentu)

### 3.4 Intent chooser copy
Judul:
- Kamu ingin hasil yang mana?

Pilihan:
- Buat iklan dari foto ini
- Rapikan fotonya dulu
- Buat desain dari teks

---

## 4. Flow Kanonis per Intent

## 4.1 Intent A: Buat Iklan dari Foto

1. Upload foto
2. Tangkap brief singkat (opsional)
3. Clarify 2-3 pertanyaan cepat
4. Pipeline otomatis: clean subject -> siapkan background -> copy headline/CTA -> komposisi
5. Tampilkan 3 konsep final
6. Pilih konsep
7. Masuk editor untuk fine tune
8. Export

Aturan penting:
- Jika remove background dijalankan, tampilkan sebagai tahap proses, bukan hasil akhir.
- CTA setelah sukses harus: Lanjut Buat Iklan.

## 4.2 Intent B: Rapikan Foto Produk

1. Upload foto
2. Pilih target hasil: bersihkan objek / tajamkan / ganti latar
3. Jalankan tool relevan
4. Tampilkan before-after
5. CTA utama: Lanjut Buat Iklan
6. CTA sekunder: Simpan sebagai aset

## 4.3 Intent C: Buat Konten dari Teks

1. Input teks
2. Clarify singkat
3. Generate copy + visual concept
4. Tampilkan opsi style/template
5. Generate final
6. Masuk editor

---

## 5. 12 Skenario User yang Harus Tercakup

1. Upload foto + prompt iklan singkat
2. Upload foto tanpa prompt
3. Prompt iklan tanpa foto
4. Prompt minta rapikan foto
5. Prompt ambigu (contoh: tolong bikin bagus)
6. User hanya mau remove background saja
7. User ingin lanjut dari hasil remove background ke iklan
8. User ingin 3 konsep lalu pilih satu
9. User ingin edit minor lalu export cepat
10. User kredit tidak cukup di tengah flow
11. Job AI timeout/gagal
12. User mobile screen kecil dengan koneksi lambat

Setiap skenario wajib punya:
- success path
- error path
- recovery action

---

## 6. State Machine Universal (Semua Flow)

State:
- idle
- collecting_input
- clarifying
- generating
- preview_ready
- editing
- exporting
- failed

Transisi wajib:
- failed -> retry
- failed -> choose_alternative
- preview_ready -> continue_next_goal

Contoh:
- preview_ready (hasil remove background) -> continue_next_goal (buat iklan)

---

## 7. Copy Framework (Non-Teknis)

## 7.1 Larangan copy
- Jangan tampilkan istilah internal: segmentation, orchestration, inference pipeline.
- Jangan berhenti di copy status teknis tanpa aksi lanjut.

## 7.2 Pola copy yang dipakai
- Status + manfaat + tindakan

Contoh:
- Kami sudah merapikan foto produkmu.
- Mau langsung lanjut jadi poster iklan?
- Tombol: Lanjut Buat Iklan

## 7.3 Tombol wajib per state
- generating: Batalkan
- success intermediate: Lanjut ke Tujuan Utama
- error: Coba Lagi / Pakai Opsi Lain

---

## 8. UX Komponen yang Perlu Ditambahkan

1. Intent Selector Card (home/create entry)
2. Intent Chooser Dialog (saat confidence menengah)
3. Next-Step Sticky Action (anti dead-end)
4. Unified Progress Tracker lintas tool
5. Recovery Sheet saat gagal (opsi alternatif jelas)

---

## 9. Mapping ke Kode Saat Ini

Referensi file yang relevan:
- frontend create flow: frontend/src/app/create/page.tsx
- smart ad flow: frontend/src/components/editor/SmartAdPanel.tsx
- remove background panel: frontend/src/components/editor/BackgroundRemovalPanel.tsx
- ai tools api: frontend/src/lib/api/aiToolsApi.ts
- smart ad api: frontend/src/lib/api/adCreatorApi.ts
- ad creator backend: backend/app/api/ad_creator.py

Gap utama saat ini:
1. Entry masih mode teknis campuran.
2. Remove background panel berakhir di Taruh di Canvas, belum mengarahkan ke goal utama.
3. Belum ada intent router eksplisit lintas jalur.

---

## 10. Implementasi Bertahap (Agar Tidak 2x Kerja)

## Phase P0 (Wajib sebelum scale)

Tujuan:
- Hilangkan dead-end setelah tool tunggal.

Task:
1. Tambah tombol Lanjut Buat Iklan pada hasil remove background.
2. Tambah next step bar global pada panel AI tools.
3. Tambah intent chooser ringan di create page.

Output:
- User yang mulai dari foto tidak nyangkut di satu tool.

## Phase P1

Tujuan:
- Router intent berjalan otomatis.

Task:
1. Implement intent classifier sederhana (keyword + context).
2. Confidence threshold dan fallback chooser.
3. Unifikasi progress indicator lintas jalur.

Output:
- Alur lebih natural untuk berbagai prompt user.

## Phase P2

Tujuan:
- Optimasi conversion dan retensi.

Task:
1. Eksperimen copy untuk CTA berikutnya.
2. Rekomendasi otomatis berdasarkan aktivitas user.
3. Persona preset (Makanan, Fashion, Skincare, dll).

Output:
- Time-to-first-ad turun, completion naik.

---

## 11. Event Tracking (Wajib untuk Validasi)

Event inti:
- intent_detected
- intent_confidence_bucket
- flow_started
- intermediate_result_shown
- continued_to_primary_goal
- flow_completed
- export_completed
- flow_failed
- recovery_action_clicked

Metric utama:
1. Intermediate-to-goal continuation rate
2. Time to first ad
3. Flow completion rate
4. Export rate
5. Drop-off per state

Target awal:
- continuation dari remove background ke iklan >= 50%
- completion create flow >= 35%
- drop-off setelah intermediate < 20%

---

## 12. Error Handling Blueprint

Jenis error yang wajib ditangani:
1. Kredit kurang
2. Timeout AI
3. Upload gagal
4. Format file tidak valid
5. Job queue lambat

Setiap error harus menampilkan:
- apa yang terjadi
- apa yang bisa dilakukan sekarang
- estimasi/alternatif

Contoh:
- Proses belum selesai karena koneksi model sedang padat.
- Kamu bisa tunggu sebentar atau lanjut pakai template cepat.

---

## 13. QA Checklist Lengkap (No Missing Requirement)

Checklist global:
- [ ] Semua flow punya next action jelas
- [ ] Tidak ada success screen yang buntu
- [ ] Mobile layout tetap bisa menuntaskan flow
- [ ] Error selalu punya recovery button
- [ ] Copy tidak menggunakan jargon teknis
- [ ] Event tracking aktif di semua transisi penting

Checklist per intent:
- [ ] A: Buat Iklan dari Foto end-to-end selesai sampai export
- [ ] B: Rapikan Foto bisa lanjut ke iklan
- [ ] C: Teks ke iklan selesai tanpa wajib upload foto

---

## 14. Definisi Selesai (Definition of Done)

Fitur dianggap selesai jika:
1. 3 intent utama bisa diselesaikan end-to-end.
2. Tidak ada dead-end setelah output intermediate.
3. Funnel data menunjukkan penurunan drop-off signifikan.
4. Uji pengguna non-teknis bisa menyelesaikan flow tanpa bantuan.

---

## 15. Ringkasan Keputusan

Keputusan utama:
- Keep all tools, hide complexity.
- Users choose outcomes, system chooses tools.
- Intermediate outputs must always bridge to final goal.

Kalimat produk yang dipakai tim:
- Design Studio adalah asisten desain jualan.
- Bukan toolbox AI yang user harus rangkai sendiri.
