import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CSPostHogProvider } from "@/app/providers";
import { DeploymentGuard } from "@/components/providers/DeploymentGuard";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";

export const metadata: Metadata = {
  metadataBase: new URL("https://smartdesign.id"),
  title: "SmartDesign Studio | Foto Produk AI untuk UMKM",
  description: "Bantu UMKM menyiapkan foto produk dan materi katalog lebih rapi dan konsisten. Cocok untuk tim kecil yang ingin proses konten promo terasa lebih terarah.",
  keywords: [
    "edit foto produk ai",
    "foto produk umkm",
    "background remover ai",
    "foto katalog shopee",
    "aplikasi edit foto jualan",
    "ai image generator indonesia",
    "konten promo marketplace",
    "desain katalog umkm"
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SmartDesign Studio | Foto Produk AI untuk UMKM & Marketplace",
    description: "Bantu pelaku UMKM menyiapkan visual produk yang lebih konsisten untuk katalog dan konten promo marketplace.",
    url: "/",
    siteName: "SmartDesign Studio",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/after-product.png",
        width: 1200,
        height: 630,
        alt: "SmartDesign Studio - AI foto produk dan desain katalog untuk UMKM",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SmartDesign Studio | Foto Produk AI untuk UMKM",
    description: "Bantu foto produk terlihat lebih rapi dan konsisten untuk kebutuhan katalog marketplace.",
    images: ["/after-product.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  }
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&family=Inter:ital,wght@0,100..900;1,100..900&family=Lato:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Oswald:wght@200..700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Raleway:ital,wght@0,100..900;1,100..900&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`font-sans antialiased`}
      >
        <CSPostHogProvider>
          <AuthProvider>{children}</AuthProvider>
          <DeploymentGuard />
          <WhatsAppButton />
        </CSPostHogProvider>
        <Toaster theme="dark" position="bottom-center" />
      </body>

    </html>
  );
}
