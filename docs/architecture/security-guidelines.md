# SmartDesign Studio — Security & API Guidelines

> Status: Draft v1  
> Last updated: 2026-03-28

Dokumen ini berisi standar keamanan dan _best practices_ yang **wajib** diikuti oleh semua *engineer* saat mengimplementasikan fitur API di SmartDesign Studio untuk menghindari celah keamanan serta kerentanan integritas data, khususnya terkait manipulasi file dan manajemen kuota.

---

## 1. File Upload & MIME Validation

**Masalah:** Mengandalkan ekstensi file (misal: `.png`) atau `content_type` bawaan Header HTTP (`image/png`) sangat tidak aman karena mudah dimanipulasi (_spoofing_). Menggunakan library `Pillow` sebagai detektor satu-satunya juga berisiko tinggi saat library gagal menangani struktur kustom.

**Solusi & Aturan:**
- **Wajib menggunakan `validate_uploaded_image`** dari `app.services.file_validation` untuk **setiap** byte stream gambar yang masuk dari *endpoint* manapun (AI tools, Avatar, Media, dsb).
- Validasi wajib dilakukan pada tingkat _Magic Bytes (File Signature)_ dengan membaca 10-12 *byte* pertama file secara biner (misal: `\xff\xd8\xff` untuk JPEG) dan tidak dari Header yang bisa dimanipulasi klien HTTP.
- Skrip validasi berada di `app.services.file_validation.py`. Dilarang menulis fungsi validasi yang terpisah per-_router_.

```python
# CONTOH BENAR
from app.services.file_validation import validate_uploaded_image

content = await file.read()
# Validasi ini akan melakukan `magic bytes check` 
# dan menerbitkan 400 ValidationError jika file disusupi konten berbahaya
mime_type = await validate_uploaded_image(content, user_id=current_user.id, db=db)
```

## 2. Pengecekan Kuota Penyimpanan Otomatis (Storage Quota)

**Masalah:** Fitur manipulasi AI (_retouch, background remove, ID Photo_) atau pengunggahan konten sering luput dari pemeriksaan kuota penyimpanan lokal/S3, membuat server terekspos terhadap risiko penyimpanan penuh oleh *malicious user*.

**Solusi & Aturan:**
Fungsi `validate_uploaded_image` kini telah dilengkapi pelindung kuota penyimpanan. Agar proteksi ini aktif, **Anda HARUS mengirimkan instance `user_id` dan `db`** ke dalamnya pada **setiap** pemanggilan fungsi validasi.
Fungsi tersebut akan otomatis memanggil `storage_quota_service.check_quota` di dalamnya dan memblokir unggahan dengan melempar exception 413 (_Payload Too Large_).

```python
# CONTOH SALAH TAPI SERING TERJADI (TIDAK ADA CEK KUOTA)
validate_uploaded_image(image_bytes)

# CONTOH BENAR (OTOMATIS CEK KUOTA DAN MAGIC BYTES BERSAMAAN)
await validate_uploaded_image(image_bytes, user_id=current_user.id, db=db)
```

Jika fungsi spesifik *tidak memakan memori/storage* (misalnya proses inferensi yang hanya membaca buffer dan membuangnya tanpa disimpan, seperti _brand kit logic_), Anda tidak perlu menyertakan token `user_id` dan `db`. Namun untuk setiap file yang berpeluang diunggah (`upload_image_tracked`), *binding parameter* ini mutlak wajib disematkan pada fungsi validasi.

## 3. Pesan Error (Error Handling & Masking)

**Masalah:** Pesan _error_ internal (_Exception/Traceback_ Python) yang bocor ke Frontend sangat berbahaya bagi keamanan (_information disclosure_). 

**Solusi & Aturan:**
Seluruh fungsi lapisan _Services_ (`app.services.*`) wajib menangkap _exception_ pihak ketiga, lalu segera mengonversinya ke dalam `AppException`, `ValidationError`, atau `InternalServerError` kustom.
- Pesan di level Frontend harus dilokalkan ke bahasa Indonesia dan spesifik pada aksi, misal: "Ukuran file terlalu besar." alih-alih menampilkan log server "psycopg2.OperationalError..."
- Gunakan `logger.exception("Context error..")` sebelum mengeksekusi *throw custom error* agar detail error bisa diinvestigasi di structured log server dan dikorelasikan lewat request ID oleh tim *engineer*.

## 4. Referensi Pelaksanaan (Router Checks)

Secara historis `validate_uploaded_image` telah diperbaiki dan distandardisasi di _router_ utama berikut:
- `backend/app/api/ai_tools_routers/background.py`
- `backend/app/api/ai_tools_routers/enhancement.py`
- `backend/app/api/ai_tools_routers/creative.py`
- `backend/app/api/designs_routers/media.py`

Saat menambahkan _endpoint router_ baru, harap *copy-paste* pola yang sudah berlaku dalam direktori di atas supaya standar keamanan terjaga secara platform wide.
