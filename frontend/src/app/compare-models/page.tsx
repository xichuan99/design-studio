"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { usePostHog } from "posthog-js/react";

import { ComparisonResults } from "@/components/compare/ComparisonResults";
import { AppHeader } from "@/components/layout/AppHeader";
import { useProjectApi, type ComparisonSessionResponse } from "@/lib/api";
import { COMPARE_MODELS_ENABLED } from "@/lib/feature-flags";

const DEFAULT_TIERS = ["basic", "pro", "ultra"] as const;

export default function CompareModelsPage() {
  const { status } = useSession();
  const posthog = usePostHog();
  const { createComparisonSession, getComparisonSession, getModelCatalog } = useProjectApi();

  const [rawText, setRawText] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [tiers, setTiers] = useState<Array<"basic" | "pro" | "ultra">>([...DEFAULT_TIERS]);
  const [session, setSession] = useState<ComparisonSessionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const completedOnceRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    const controller = new AbortController();
    getModelCatalog({ signal: controller.signal })
      .then((catalog) => {
        const nextTiers = catalog.items
          .filter((item) => item.tier !== "auto" && item.accessible)
          .map((item) => item.tier) as Array<"basic" | "pro" | "ultra">;
        if (nextTiers.length > 0) {
          setTiers(nextTiers);
        }
      })
      .catch(() => undefined);

    return () => {
      controller.abort();
    };
  }, [getModelCatalog, status]);

  useEffect(() => {
    if (!session || !["queued", "processing"].includes(session.status)) return;

    let lastController: AbortController | null = null;

    const interval = window.setInterval(() => {
      lastController?.abort();
      const controller = new AbortController();
      lastController = controller;
      void getComparisonSession(session.id, { signal: controller.signal })
        .then((next) => setSession(next))
        .catch(() => undefined);
    }, 3000);

    return () => {
      window.clearInterval(interval);
      lastController?.abort();
    };
  }, [getComparisonSession, session]);

  useEffect(() => {
    if (!session) return;
    if (!completedOnceRef.current && ["completed", "partial_failed"].includes(session.status)) {
      completedOnceRef.current = true;
      posthog?.capture("compare_models_completed", {
        session_id: session.id,
        status: session.status,
        tiers: session.requested_tiers,
      });
    }
  }, [posthog, session]);

  if (status === "loading") {
    return <div className="flex h-screen items-center justify-center">Memuat...</div>;
  }

  if (status === "unauthenticated") {
    redirect("/");
  }

  if (!COMPARE_MODELS_ENABLED) {
    redirect("/start");
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    completedOnceRef.current = false;
    try {
      const created = await createComparisonSession({
        raw_text: rawText,
        aspect_ratio: aspectRatio,
        tiers,
        integrated_text: false,
      });
      setSession(created);
      posthog?.capture("compare_models_started", {
        session_id: created.id,
        tiers: created.requested_tiers,
        aspect_ratio: created.aspect_ratio,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memulai perbandingan.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!session) return;
    const shareUrl = `${window.location.origin}/compare-models/${session.share_slug}`;
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 2000);
    posthog?.capture("comparison_shared", { session_id: session.id, share_slug: session.share_slug });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
        <section className="rounded-3xl border bg-card p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Bandingkan Model</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Bandingkan hasil dari beberapa model AI</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Tulis satu brief, lalu lihat hasil `Basic`, `Pro`, dan `Ultra` berdampingan tanpa perlu mengulang prompt manual satu per satu.</p>
        </section>

        <section className="rounded-3xl border bg-card p-6 md:p-8">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Contoh: Buat poster promo minuman boba dengan headline tebal, nuansa segar, dan ruang harga yang jelas"
              className="min-h-[140px] w-full rounded-2xl border bg-background px-4 py-3 text-sm outline-none ring-0 transition-colors focus:border-primary"
              required
            />
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm text-foreground">
                <span className="font-medium">Rasio Aspek</span>
                <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="h-11 w-full rounded-xl border bg-background px-3">
                  <option value="1:1">1:1</option>
                  <option value="4:5">4:5</option>
                  <option value="9:16">9:16</option>
                  <option value="16:9">16:9</option>
                </select>
              </label>
              <div className="space-y-2 text-sm text-foreground md:col-span-2">
                <span className="font-medium">Tier yang dibandingkan</span>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TIERS.map((tier) => {
                    const active = tiers.includes(tier);
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => {
                          setTiers((prev) => prev.includes(tier) ? prev.filter((current) => current !== tier) : [...prev, tier]);
                        }}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}
                      >
                        {tier.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={loading || tiers.length === 0} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {loading ? "Menyiapkan perbandingan..." : "Mulai perbandingan"}
              </button>
              {shareCopied && <span className="text-sm text-emerald-600">Link share berhasil disalin.</span>}
            </div>
          </form>
        </section>

        {session && <ComparisonResults session={session} onShare={handleShare} />}
      </main>
    </div>
  );
}