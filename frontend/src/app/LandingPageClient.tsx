"use client";

import { useSearchParams } from "next/navigation";
import { ArrowRight, Banknote, CheckCircle2, Copy, ImageOff, Sparkles, Clock, Gift } from "lucide-react";
import { CapabilityMarquee } from "@/components/landing/CapabilityMarquee";
import { ComparisonTableSection } from "@/components/landing/ComparisonTableSection";
import { ResultGallery } from "@/components/landing/ResultGallery";
import { FAQSection } from "@/components/landing/FAQSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ObjectionSection } from "@/components/landing/ObjectionSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { useEffect, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { resolveLandingExperimentVariantWithOptions } from "@/lib/experiments";
import { getAnalyticsVisitorId, trackBackendFunnelEvent } from "@/lib/analytics/backend";
import {
  trackLandingCtaClicked,
  trackLandingViewed,
  trackWaitlistSubmitted,
} from "@/lib/analytics/experiments";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

type WaitlistJoinResult = {
  position: number;
  is_new: boolean;
};

export default function LandingPage() {
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistResult, setWaitlistResult] = useState<WaitlistJoinResult | null>(null);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  const [landingVariant, setLandingVariant] = useState<string>("control");

  const handleJoinWaitlist = (ctaLocation: string) => {
    trackLandingCtaClicked(posthog, {
      variant: landingVariant,
      cta_name: "join_waitlist",
      cta_location: ctaLocation,
    });
    const waitlistSection = document.getElementById("waitlist-signup");
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    window.location.hash = "waitlist-signup";
  };

  useEffect(() => {
    const resetFlag = searchParams?.get("exp_reset") === "1";
    const overrideVariant = searchParams?.get("exp_variant");
    const variant = resolveLandingExperimentVariantWithOptions({
      distinctId: posthog?.get_distinct_id?.(),
      reset: resetFlag,
      overrideVariant,
    });
    setLandingVariant(variant);
    trackLandingViewed(posthog, variant);
    void trackBackendFunnelEvent(posthog?.get_distinct_id?.(), "landing_viewed", {
      variant,
      source: "landing_page",
      properties: {
        variant,
        visitor_id: getAnalyticsVisitorId(posthog?.get_distinct_id?.()),
      },
    });

    const loadWaitlistCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/waitlist/count`);
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as { total?: number };
        if (typeof data.total === "number") {
          setWaitlistCount(data.total);
        }
      } catch {
        // Keep UI working when count endpoint is unavailable.
      }
    };

    void loadWaitlistCount();
  }, [posthog, searchParams]);

  const handleWaitlistSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const email = waitlistEmail.trim().toLowerCase();
    if (!email) {
      setWaitlistError("Email wajib diisi.");
      return;
    }

    setWaitlistLoading(true);
    setWaitlistError(null);
    setWaitlistResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          source: "landing_footer",
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { position?: number; is_new?: boolean; error?: { detail?: string } }
        | null;

      if (!res.ok) {
        const detail = data?.error?.detail || "Gagal mendaftar. Coba lagi sebentar.";
        setWaitlistError(detail);
        return;
      }

      setWaitlistResult({
        position: data?.position ?? 0,
        is_new: Boolean(data?.is_new),
      });
      trackWaitlistSubmitted(posthog, {
        source: "landing_footer",
        variant: landingVariant,
        is_new: Boolean(data?.is_new),
        position: data?.position ?? null,
      });
      setWaitlistEmail("");

      setWaitlistCount((prev) => {
        if (typeof prev !== "number") {
          return prev;
        }
        return data?.is_new ? prev + 1 : prev;
      });
    } catch {
      setWaitlistError("Koneksi ke server terputus. Silakan coba lagi.");
    } finally {
      setWaitlistLoading(false);
    }
  };

  const jsonLD = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "SmartDesign Studio",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "IDR",
    },
    "description": "Platform AI untuk workflow desain UMKM — daftar gratis dan dapat 100 kredit + bonus PDF ide konten."
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen antialiased relative overflow-x-hidden font-sans dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLD) }}
      />
      {/* Background Orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(108,43,238,0.15)_0%,rgba(11,9,16,0)_70%)] pointer-events-none -z-10 blur-3xl"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(66,135,245,0.1)_0%,rgba(11,9,16,0)_70%)] pointer-events-none -z-10 blur-3xl"></div>

      <div className="relative flex min-h-screen w-full flex-col z-10 px-4 md:px-10 lg:px-40 py-5">
        <div className="max-w-[1200px] w-full mx-auto flex flex-col flex-1">

          <LandingHeader
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            onJoinWaitlist={handleJoinWaitlist}
          />

          {/* Hero Section */}
          <HeroSection onJoinWaitlist={handleJoinWaitlist} waitlistCount={waitlistCount} />

          {/* Kenapa AI Chatbot Tidak Cukup */}
          <ComparisonTableSection />

          {/* Capability Marquee */}
          <div className="mb-20">
            <CapabilityMarquee />
          </div>

          {/* Result Gallery (Output Showcase) */}
          <div>
            <ResultGallery />
          </div>

          {/* Cara Kerjanya Section */}
          <HowItWorksSection />

          {/* UMKM Feature Highlights Section */}
          <ScrollReveal>
            <div id="features" className="flex flex-col gap-12 py-20 border-t border-white/5 relative">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-blue-400 font-semibold tracking-wider uppercase text-sm">Solusi Bisnis</span>
                <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white mb-2">
                  Satu Platform, Semua Kebutuhan Visual UMKM
                </h2>
                <p className="text-slate-400 text-lg max-w-[600px]">
                  Nggak perlu pindah-pindah app. Dari foto produk sampai desain promo, semua bisa di sini.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <div className="w-14 h-14 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl flex items-center justify-center mb-6">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">AI Desain Katalog & Konten Promo</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Ceritakan produkmu — AI yang mikirin headline, warna, layout, dan caption. Hasilnya 3 variasi desain siap pilih dalam 2 menit.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <div className="w-14 h-14 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl flex items-center justify-center mb-6">
                    <ImageOff className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Edit Foto Produk AI & Penghapus Latar</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Foto HP biasa jadi foto katalog profesional. Hapus background, ganti suasana, retouch, upscale — semua dalam 3 detik per foto.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl flex items-center justify-center mb-6">
                    <Copy className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">AI Copywriting untuk Caption Promo</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Writer&apos;s block? Kasih tau AI produk dan targetmu — dapat 3 caption FOMO, benefit-driven, dan social proof langsung tinggal copas.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all duration-300">
                  <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center mb-6">
                    <Banknote className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Edit Batch Foto Produk (50 Foto)</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Upload puluhan SKU sekaligus. AI proses semua dengan setting yang sama — background seragam, lighting konsisten, siap upload massal.
                  </p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Audience Fit Section */}
          <ScrollReveal>
            <div className="py-20 border-t border-white/5 relative">
              <div className="flex flex-col items-center gap-4 text-center mb-10 px-4">
                <span className="text-purple-400 font-semibold tracking-wider uppercase text-sm">Untuk Siapa</span>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight text-white">
                  Dibuat Khusus untuk Pelaku UMKM Indonesia
                </h2>
                <p className="text-slate-400 text-lg max-w-3xl">
                  Nggak pernah pakai Photoshop? Gapapa. Nggak ngerti prompt engineering? Juga gapapa.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4">
                {[
                  "Pemilik warung, kafe, atau toko online yang butuh konten promo harian tanpa sewa desainer",
                  "Seller fashion yang foto produknya masih berantakan dan pengen feed Instagram lebih rapi",
                  "Pemilik jasa (salon, klinik, kursus) yang ingin terlihat profesional tapi budget terbatas",
                  "Reseller yang pengen produksi konten cepat tanpa mikirin desain satu per satu",
                ].map((item) => (
                  <div key={item} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-slate-200 text-sm md:text-base flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Testimonials */}
          <TestimonialsSection waitlistCount={waitlistCount} />

          <ObjectionSection />

          {/* FAQ Section */}
          <ScrollReveal>
            <FAQSection />
          </ScrollReveal>

          {/* Full Pricing / Credit Store */}
          <ScrollReveal direction="up" delay={200}>
            <PricingSection onJoinWaitlist={handleJoinWaitlist} />
          </ScrollReveal>

          {/* Sticky Bottom CTA Bar (Mobile Only) */}
          <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 p-3 md:hidden z-50 flex items-center justify-between gap-3"
               style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex flex-col"
>              <span className="text-white text-sm font-bold"
>Daftar Gratis</span
>              <span className="text-slate-400 text-xs"
>100 kredit + PDF bonus</span
>            </div
>            <button
              onClick={() => handleJoinWaitlist("sticky_mobile")}
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap"
            >
              Ambil Slot
            </button>
          </div>

          {/* Final CTA */}
          <ScrollReveal>
            <div className="py-20 border-t border-white/5 relative">
              <div className="mx-4 rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-900/35 to-blue-900/30 p-8 md:p-12 text-center">
                <div className="inline-flex items-center gap-2 bg-yellow-500/10 rounded-full px-4 py-1.5 mb-6 border border-yellow-500/30">
                  <Clock className="text-yellow-400 h-4 w-4" />
                  <span className="text-xs font-bold text-yellow-300"
>Slot Terbatas — Batch Pertama Tutup Setelah 500 Pendaftar</span
>                </div>

                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
                  Jangan Sampai Tokomu Ketinggalan Kereta Pertama
                </h2>
                <p className="text-slate-300 text-base md:text-lg max-w-3xl mx-auto mb-8">
                  Feed kompetitor makin rapi. Pelanggan makin pilih-pilih. SmartDesign dibuat supaya kamu bisa tampil profesional tanpa bingung pilih model AI. Tanpa belajar desain. Tanpa sewa desainer.
                </p>

                {/* Incentive Stack */}
                <div className="flex flex-wrap justify-center gap-3 mb-8"
>                  {[
                    { icon: Gift, text: "100 Kredit Gratis" },
                    { icon: CheckCircle2, text: "PDF 30 Ide Konten UMKM" },
                    { icon: CheckCircle2, text: "Akses Prioritas Batch 1" },
                    { icon: CheckCircle2, text: "Harga Spesial Selamanya" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2"
>                      <Icon className="w-4 h-4 text-purple-400" />
                      <span className="text-slate-300 text-sm"
>{text}</span
>                    </div>
                  ))}
                </div
>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4"
>                  <button
                    onClick={() => handleJoinWaitlist("final_cta")}
                    className="flex items-center justify-center gap-2 rounded-xl h-14 px-8 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold shadow-[0_0_30px_rgba(108,43,238,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:scale-105 transition-all"
                  >
                    <span>Daftar Gratis Sekarang</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>

                {typeof waitlistCount === "number" && waitlistCount > 0 && (
                  <p className="mt-4 text-sm text-slate-400">
                    <strong className="text-white">{waitlistCount.toLocaleString("id-ID")} UMKM</strong> sudah bergabung. Sisa slot: <strong className="text-purple-300">{Math.max(0, 500 - waitlistCount)}</strong>
                  </p>
                )}
              </div>
            </div>
          </ScrollReveal>

          <LandingFooter
            waitlistCount={waitlistCount}
            waitlistEmail={waitlistEmail}
            waitlistLoading={waitlistLoading}
            waitlistError={waitlistError}
            waitlistResult={waitlistResult}
            onWaitlistEmailChange={setWaitlistEmail}
            onWaitlistSubmit={handleWaitlistSubmit}
          />
        </div>
      </div>
    </div>
  );
}
