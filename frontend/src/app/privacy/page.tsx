import type { Metadata } from "next";

import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | SmartDesign Studio",
  description:
    "Penjelasan data yang dikumpulkan SmartDesign Studio, penggunaan provider AI pihak ketiga, retensi, dan penghapusan data untuk paid beta.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy & Data Deletion"
      title="Kebijakan Privasi SmartDesign Studio"
      description="Halaman ini menjelaskan data apa yang kami proses selama paid beta, kapan aset Anda dikirim ke provider pihak ketiga, dan bagaimana penghapusan akun serta data dilakukan."
      lastUpdated="12 Mei 2026"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">1. Data yang kami proses</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Saat Anda menggunakan SmartDesign Studio, kami dapat memproses data akun, prompt,
          brief desain, aset yang Anda unggah, metadata penggunaan kredit, status job AI,
          histori ekspor, dan feedback produk yang Anda kirimkan.
        </p>
        <ul className="space-y-2 text-sm leading-7 text-slate-300 sm:text-base">
          <li>Data akun: nama, email, provider login, dan preferensi akun.</li>
          <li>Data desain: project, layer canvas, hasil generasi, dan file yang Anda unggah.</li>
          <li>Data operasional: transaksi kredit, biaya AI, log error, dan status pembayaran storage.</li>
          <li>Data feedback: rating ekspor, catatan bebas, dan sinyal operasional lain untuk paid beta.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">2. Cara data digunakan</h2>
        <ul className="space-y-2 text-sm leading-7 text-slate-300 sm:text-base">
          <li>Menjalankan upload, generate, edit, export, billing, dan support flow.</li>
          <li>Mengukur funnel paid beta, penggunaan kredit, refund, dan performa job AI.</li>
          <li>Mengamankan layanan dari abuse, spam, dan penggunaan yang melanggar hukum.</li>
          <li>Meningkatkan kualitas workflow beta berdasarkan feedback dan error operasional.</li>
        </ul>
      </section>

      <section className="space-y-3" id="penyedia-pihak-ketiga">
        <h2 className="text-xl font-semibold text-white">3. Provider pihak ketiga</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Untuk menjalankan fitur AI dan operasional produk, SmartDesign Studio dapat mengirim
          data yang relevan ke provider pihak ketiga yang kami konfigurasi. Data yang dikirim
          dibatasi pada yang dibutuhkan untuk menyelesaikan permintaan Anda.
        </p>
        <ul className="space-y-2 text-sm leading-7 text-slate-300 sm:text-base">
          <li>Model teks/LLM: OpenRouter dan Google Gemini untuk brief, copy, dan reasoning.</li>
          <li>Model gambar: Fal.ai atau provider image generation lain yang dikonfigurasi.</li>
          <li>Storage: penyimpanan S3-compatible untuk file yang Anda unggah dan hasil desain.</li>
          <li>Pembayaran: Midtrans untuk flow checkout storage berbayar.</li>
          <li>Email operasional: provider email transaksi yang kami aktifkan untuk waitlist atau notifikasi.</li>
        </ul>
        <p className="text-sm leading-7 text-slate-400 sm:text-base">
          Kebijakan retensi dan pemrosesan pada sistem provider tersebut mengikuti kebijakan layanan
          masing-masing provider di samping kebijakan SmartDesign Studio ini.
        </p>
      </section>

      <section className="space-y-3" id="penghapusan-data">
        <h2 className="text-xl font-semibold text-white">4. Penghapusan data</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Pengguna yang sudah login dapat menghapus akun dari Settings melalui bagian Danger Zone.
          Permintaan tersebut memicu penghapusan data dari sistem aktif SmartDesign Studio,
          termasuk profil, project, aset terunggah, histori desain, dan sisa kredit yang terkait akun itu.
        </p>
        <ul className="space-y-2 text-sm leading-7 text-slate-300 sm:text-base">
          <li>Penghapusan akun bersifat permanen dan tidak dapat dibatalkan.</li>
          <li>Log operasional atau cadangan yang sudah terlanjur dibuat dapat bertahan sementara sampai siklus retensi internal berakhir.</li>
          <li>Catatan pembayaran dapat dipertahankan seperlunya untuk rekonsiliasi dan kewajiban hukum.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">5. Keamanan & retensi</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Kami menerapkan validasi upload, kontrol akses berbasis akun, token internal untuk dashboard operator,
          dan guardrail konfigurasi produksi agar secret penting tidak hilang di environment staging/production.
          Paid beta ini tetap merupakan layanan yang berkembang, sehingga Anda sebaiknya tidak mengunggah data
          yang tidak perlu atau rahasia tinggi tanpa proses review internal Anda sendiri.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">6. Kontak</h2>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">
          Untuk pertanyaan privasi, penghapusan data, atau disclosure provider, hubungi tim SmartDesign Studio
          melalui kanal support yang tersedia saat paid beta atau email operasional yang kami gunakan saat onboarding.
        </p>
      </section>
    </LegalPageShell>
  );
}