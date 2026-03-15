import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CSPostHogProvider } from "@/app/providers";
import { DeploymentGuard } from "@/components/providers/DeploymentGuard";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";

export const metadata: Metadata = {
  title: "SmartDesign Studio | Foto Produk AI Siap Jual untuk UMKM",
  description: "Ubah foto produk HP biasa menjadi kualitas studio dalam 30 detik dengan AI. Hemat 2-5 juta/bulan tanpa sewa fotografer. Coba gratis sekarang!",
  keywords: ["edit foto produk ai", "foto produk umkm", "background remover ai", "foto katalog shopee", "aplikasi edit foto jualan", "ai image generator indonesia"],
  openGraph: {
    title: "SmartDesign Studio | AI Foto Produk UMKM",
    description: "Ubah foto hp biasa jadi foto katalog profesional dalam 30 detik.",
    url: "https://smartdesign.id",
    siteName: "SmartDesign Studio",
    locale: "id_ID",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
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
