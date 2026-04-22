import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CSPostHogProvider } from "@/app/providers";
import { DeploymentGuard } from "@/components/providers/DeploymentGuard";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";

export const metadata: Metadata = {
  metadataBase: new URL("https://smartdesign.id"),
  title: "Edit Foto Produk AI UMKM & Katalog Otomatis 2026 | SmartDesign Studio",
  description: "Platform edit foto produk AI untuk UMKM dan pembuat katalog marketplace otomatis. Dari cerita jadi desain siap posting dalam 30 detik. Solusi konten bisnis 2026.",
  keywords: [
    "edit foto produk ai umkm",
    "katalog marketplace otomatis",
    "desain katalog ai 2026",
    "bikin konten shopee tiktok otomatis",
    "background remover ai",
    "foto promosi umkm",
    "studio visual ai indonesia",
    "studio foto online umkm"
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Edit Foto Produk AI UMKM & Katalog Otomatis 2026 | SmartDesign",
    description: "Dari cerita jadi desain siap posting dalam 30 detik. Solusi praktis pembuatan katalog e-commerce untuk UMKM Indonesia.",
    url: "/",
    siteName: "SmartDesign Studio",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/images/examples/bg-swap-after.png",
        width: 1200,
        height: 630,
        alt: "SmartDesign Studio - AI foto produk dan desain katalog otomatis untuk UMKM",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Edit Foto Produk AI UMKM & Katalog Otomatis | SmartDesign Studio",
    description: "Pembuat katalog marketplace otomatis. Dari cerita jadi desain siap posting dalam 30 detik.",
    images: ["/images/examples/bg-swap-after.png"],
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
