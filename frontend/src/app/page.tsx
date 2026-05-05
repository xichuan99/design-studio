import type { Metadata } from "next";
import { Suspense } from "react";

import LandingPageClient from "./LandingPageClient";

export const metadata: Metadata = {
  title: "SmartDesign Studio - Multi-Model AI untuk Desain UMKM",
  description:
    "Agregasi model AI terbaik untuk desain UMKM. Dari brief ke desain siap pakai dengan workflow terarah.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SmartDesign Studio - Multi-Model AI untuk Desain UMKM",
    description:
      "Dari brief singkat ke desain siap pakai lewat workflow AI yang terarah untuk UMKM Indonesia.",
    url: "/",
    siteName: "SmartDesign Studio",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartDesign Studio - Multi-Model AI untuk Desain UMKM",
    description:
      "Workflow desain AI terarah untuk UMKM Indonesia: cepat, konsisten, dan siap pakai.",
  },
};

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageClient />
    </Suspense>
  );
}
