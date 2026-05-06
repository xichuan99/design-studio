import type { Metadata } from "next";
import Link from "next/link";

const CONTENT: Record<string, { title: string; description: string; bullets: string[] }> = {
  "gpt-image": {
    title: "SmartDesign vs GPT Image",
    description: "GPT Image kuat untuk output tunggal, tetapi SmartDesign menambahkan workflow, selector model, brand kit, dan format siap pakai untuk tim UMKM.",
    bullets: [
      "Bandingkan model tanpa menulis ulang prompt.",
      "Lanjutkan hasil ke editor dan format marketplace.",
      "Simpan brand context agar output berikutnya lebih konsisten.",
    ],
  },
  "canva": {
    title: "SmartDesign vs Canva",
    description: "Canva unggul di editing manual, sedangkan SmartDesign menonjol di guided AI workflow untuk brief-to-design dan photo tools UMKM.",
    bullets: [
      "Mulai dari brief, bukan canvas kosong.",
      "Model AI bertingkat untuk kebutuhan cepat sampai premium.",
      "Photo tools dan comparison session ada dalam satu alur.",
    ],
  },
  chatgpt: {
    title: "SmartDesign vs ChatGPT",
    description: "ChatGPT membantu brainstorming, tetapi SmartDesign mengubah ide menjadi hasil visual siap pakai dengan kontrol aspek rasio, pricing, dan editor yang lebih spesifik untuk desain bisnis.",
    bullets: [
      "Tidak berhenti di prompt dan ide visual saja.",
      "Hasil bisa dibandingkan, dipilih, lalu dioper ke editor.",
      "Akses model ditata sesuai paket dan use case.",
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const current = CONTENT[slug] || CONTENT["gpt-image"];
  return {
    title: current.title,
    description: current.description,
    alternates: { canonical: `/vs/${slug}` },
    openGraph: {
      title: current.title,
      description: current.description,
      url: `/vs/${slug}`,
      siteName: "SmartDesign Studio",
      type: "article",
    },
  };
}

export default async function VersusPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const current = CONTENT[slug] || CONTENT["gpt-image"];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-12 md:px-6">
      <section className="rounded-3xl border bg-card p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Halaman Perbandingan</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{current.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{current.description}</p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {current.bullets.map((item) => (
          <article key={item} className="rounded-2xl border bg-card p-5 text-sm leading-6 text-muted-foreground">
            {item}
          </article>
        ))}
      </section>
      <section className="rounded-3xl border bg-card p-8">
        <h2 className="text-2xl font-semibold text-foreground">Apa yang paling relevan untuk tim Anda?</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Jika Kamu butuh workflow yang langsung bergerak dari brief ke visual siap pakai, gunakan Jalur Desain atau bandingkan model lebih dulu lewat sesi perbandingan.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/compare-models" className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Buka Bandingkan Model</Link>
          <Link href="/" className="rounded-xl border px-4 py-3 text-sm font-semibold text-foreground">Kembali ke Beranda</Link>
        </div>
      </section>
    </main>
  );
}