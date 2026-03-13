import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { CSPostHogProvider } from "@/app/providers";
import { DeploymentGuard } from "@/components/providers/DeploymentGuard";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Design Studio",
  description: "Desain Grafis Instan untuk UMKM",
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}
      >
        <CSPostHogProvider>
          <AuthProvider>{children}</AuthProvider>
          <DeploymentGuard />
        </CSPostHogProvider>
        <Toaster theme="dark" position="bottom-center" />
      </body>

    </html>
  );
}
