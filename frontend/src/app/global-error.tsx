"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error("Critical root boundary error caught:", error);
  }, [error]);

  return (
    <html lang="id" className="dark">
      <body className="font-sans antialiased text-white bg-[#0A0A0A]">
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <div className="bg-[#1A1A1A] border border-[#333] min-w-[300px] max-w-md p-8 pt-10 rounded-2xl flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 flex items-center justify-center rounded-full mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-white">
              Sistem Mengalami Gangguan
            </h2>
            <p className="text-gray-400 mb-8">
              Terjadi kesalahan fatal yang tidak dapat diproses. Kami menyarankan untuk memuat ulang halaman.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" />
                Muat Ulang Paksa
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
