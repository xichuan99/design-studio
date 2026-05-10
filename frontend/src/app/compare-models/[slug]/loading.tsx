import { Loader2 } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";

export default function SharedComparisonLoading() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
        <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border bg-card px-6 py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Memuat sesi perbandingan</p>
              <p className="text-sm text-muted-foreground">Sedang mengambil hasil model yang dibagikan.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
