"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UpscalerPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 max-w-4xl mx-auto p-6 md:p-8 w-full">
        <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => router.push("/tools")}>
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>

        <div className="max-w-2xl mx-auto mt-16 border border-border rounded-2xl p-8 bg-card">
          <h1 className="text-3xl font-jakarta font-bold text-foreground">Fitur Upscaler Dinonaktifkan</h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            Upscaler saat ini sudah kami nonaktifkan karena tingkat penggunaan rendah.
            Kamu tetap bisa pakai tool lain seperti Retouch, Background Swap, Product Scene, dan lainnya.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => router.push("/tools/retouch")}>Buka Retouch</Button>
            <Button variant="outline" onClick={() => router.push("/tools")}>Kembali ke AI Tools</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
