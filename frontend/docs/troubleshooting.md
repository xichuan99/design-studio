# SmartDesign Studio: Troubleshooting Common Issues

Berikut adalah daftar masalah umum yang sering dihadapi pengguna saat menggunakan SmartDesign Studio dan solusinya.

## 1. Gambar Hasil AI Kosong atau Gagal Render
**Gejala**: Setelah menekan "Generate Image", layar preview blank atau tidak merender apapun, dan Anda disuruh mencoba lagi.
**Solusi**:
- Cek batas **Kredit Anda**. Saat saldo habis, akses API akan di-block sementara. Harap top up.
- Mungkin prompt Anda terdeteksi mengandung unsur sensitif/NSFW. Coba ubah prompt secara lebih jinak.
- Apabila terjadi *timeout* (proses butuh lebih dari 60 detik), sistem kadang berhenti. Kredit Anda tidak akan terpotong; silakan *retry*.

## 2. Editor Berjalan Sangat Lambat (Lag)
**Gejala**: Memindahkan elemen teks atau stiker terasa berat, patah-patah, atau memori browser tersita penuh.
**Solusi**:
- Kurangi jumlah lapisan (*layers*). Editor SmartDesign dioptimalkan untuk performa web, tapi >20 layer berat (terutama gambar transparan beresolusi tinggi) akan menguras RAM.
- Fitur *Remove Background* kadang memakan waktu. Tunggu icon *loading* selesai sebelum melakukan rotasi/scaling objek tersebut.
- Refresh halaman (F5). Proyek Anda selalu otomatis tersimpan (Auto-save) setiap beberapa detik.

## 3. Template Tidak Sesuai Atau Terlalu Berantakan
**Gejala**: Anda memilih template promo "Flash Sale", tapi saat gambar produk masuk, teksnya tertutup atau layout berantakan.
**Solusi**:
- Gunakan fitur **Arahkan Ulang (Layer Forward / Layer Backward)** di panel sebelah kanan untuk membawa teks ke atas produk.
- Sesuaikan warna kontras teks terhadap background secara manual menggunakan fitur palet. Kadang AI mengambil dominasi warna gelap yang menenggelamkan teks Anda.

## 4. Ekspor Gambar Gagal ('Tainted Canvas' Error)
**Gejala**: Saat menekan tombol **Unduh / Ekspor**, tidak ada file PNG/JPG yang tersimpan, atau konsol browser menunjukkan error `Tainted Canvas`.
**Solusi**:
- Ini terjadi jika Anda mengimpor gambar dari luar web tanpa proxy CORS. Pastikan gambar diunggah melalui tombol resmi "Upload" atau menggunakan aset galeri di dalam platform kami.

## 5. Storage (Penyimpanan) Penuh
**Gejala**: Muncul pesan "Kuota Penyimpanan Habis" atau "413 Payload Too Large".
**Solusi**:
- Paket Free memiliki batasan penyimpanan maksimal 100MB per akun pengguna.
- Pergi ke **Pengaturan (Settings) > Kelola File**, dan hapus beberapa project "Draft" lawas atau foto yang sudah tidak lagi digunakan.

---
*Jika masalah Anda tetap muncul setelah mengikuti panduan ini, silakan hubungi tim Customer Support via WhatsApp tombol hijau di bawah layar Anda.*
