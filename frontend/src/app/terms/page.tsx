import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan | SmartDesign Studio",
  description:
    "Syarat penggunaan SmartDesign Studio untuk paid beta, termasuk penggunaan AI, kredit, pembayaran, dan tanggung jawab pengguna.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Terms of Service"
      title="Syarat & Ketentuan SmartDesign Studio"
      description="Dengan menggunakan SmartDesign Studio selama paid beta, Anda menyetujui syarat penggunaan berikut untuk akses akun, kredit, hasil AI, dan kewajiban operasional."
      lastUpdated="12 Mei 2026"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. Ruang lingkup paid beta</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          SmartDesign Studio adalah layanan desain berbasis AI yang masih berada pada fase paid beta terbatas.
          Fitur, harga, kuota, dan batas penggunaan dapat berubah sewaktu-waktu selama periode evaluasi produk.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. Penggunaan yang diizinkan</h2>
        <ul className="space-y-2 text-sm leading-7 text-slate-300 sm:text-base">
          <li>Anda hanya boleh mengunggah aset yang memang berhak Anda gunakan.</li>
          <li>Anda tidak boleh memakai layanan untuk spam, penipuan, pelanggaran hak cipta, atau konten ilegal.</li>
          <li>Anda bertanggung jawab atas copy, visual, dan klaim komersial yang akhirnya dipublikasikan.</li>
          <li>Anda wajib meninjau hasil AI sebelum dipakai untuk marketplace, iklan, atau materi publik.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">3. Hak atas konten</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Anda tetap memiliki hak atas aset yang Anda unggah. Dengan memakai layanan ini, Anda memberi
          SmartDesign Studio izin terbatas untuk menyimpan, memproses, dan meneruskan aset atau prompt tersebut
          ke provider yang diperlukan agar permintaan desain Anda bisa diselesaikan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">4. Kredit, pembayaran, dan refund</h2>
        <ul className="space-y-2 text-sm leading-7 text-slate-300 sm:text-base">
          <li>Setiap operasi AI dapat mengonsumsi kredit sesuai biaya yang ditampilkan di produk.</li>
          <li>Pembelian storage atau add-on berbayar mengikuti harga dan status checkout yang tampil saat transaksi.</li>
          <li>Jika proses AI gagal karena error sistem, SmartDesign Studio akan berupaya mengembalikan kredit sesuai ledger internal.</li>
          <li>Riwayat biaya, refund, dan status job dapat dipantau secara internal untuk rekonsiliasi paid beta.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. Output AI dan disclaimer</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Output AI bisa tidak akurat, tidak lengkap, atau tidak sesuai standar platform tujuan Anda.
          SmartDesign Studio tidak menjamin bahwa hasil AI selalu lolos kebijakan marketplace, iklan,
          atau regulator. Review manusia tetap wajib sebelum dipublikasikan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. Penangguhan, perubahan, dan pengakhiran</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Kami dapat membatasi, menangguhkan, atau mengakhiri akses bila ada indikasi abuse,
          risiko keamanan, atau penggunaan yang melanggar syarat ini. Kami juga dapat mengubah fitur,
          limit, atau provider selama paid beta untuk alasan kualitas, biaya, atau keamanan.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">7. Hubungi kami</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Jika Anda memerlukan klarifikasi terkait akses beta, billing, atau pemakaian konten,
          gunakan kanal support SmartDesign Studio yang disediakan selama onboarding beta.
        </p>
      </section>
    </LegalPageShell>
  );
}