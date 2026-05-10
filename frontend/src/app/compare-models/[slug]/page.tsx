"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { ComparisonResults } from "@/components/compare/ComparisonResults";
import { AppHeader } from "@/components/layout/AppHeader";
import { useProjectApi, type ComparisonSessionResponse } from "@/lib/api";

export default function SharedComparisonPage() {
  const params = useParams<{ slug: string }>();
  const { getSharedComparisonSession } = useProjectApi();
  const [session, setSession] = useState<ComparisonSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.slug) return;
    let mounted = true;
    getSharedComparisonSession(params.slug)
      .then((data) => {
        if (mounted) { setSession(data); setLoading(false); }
      })
      .catch((err) => {
        if (mounted) { setError(err instanceof Error ? err.message : "Perbandingan yang dibagikan tidak ditemukan."); setLoading(false); }
      });
    return () => {
      mounted = false;
    };
  }, [getSharedComparisonSession, params?.slug]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
        {loading && (
          <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border bg-card px-6 py-16">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-base font-semibold text-foreground">Memuat sesi perbandingan</p>
                <p className="text-sm text-muted-foreground">Sedang mengambil hasil model yang dibagikan.</p>
              </div>
            </div>
          </div>
        )}
        {error && <div className="rounded-2xl border bg-card p-6 text-sm text-red-600">{error}</div>}
        {session && <ComparisonResults session={session} readOnly />}
      </main>
    </div>
  );
}