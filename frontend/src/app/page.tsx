import type { Metadata } from "next";
import { Suspense } from "react";

import LandingPageClient from "./LandingPageClient";

export const metadata: Metadata = {
  title: "SmartDesign Studio — Desain AI untuk UMKM | Daftar Gratis + 100 Kredit",
  description:
    "Dari chat ke desain siap upload dalam 2 menit. 100 kredit gratis untuk pendaftar pertama. Platform AI untuk desain produk, foto katalog, dan konten promo UMKM Indonesia.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SmartDesign Studio — Desain AI untuk UMKM | Daftar Gratis + 100 Kredit",
    description:
      "Chat ke desain siap upload dalam 2 menit. Dapat 100 kredit gratis + PDF 30 ide konten UMKM. AI Interview, editor drag-drop, brand kit, format pas untuk Shopee & Instagram.",
    url: "/",
    siteName: "SmartDesign Studio",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartDesign Studio — Desain AI untuk UMKM | Daftar Gratis + 100 Kredit",
    description:
      "Chat ke desain siap upload dalam 2 menit. 100 kredit gratis untuk pendaftar pertama. Cocok untuk Shopee, Tokopedia, Instagram.",
  },
};

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageClient />
    </Suspense>
  );
}
