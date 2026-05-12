import type { ReactNode } from "react";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { PublicLegalLinks } from "@/components/legal/PublicLegalLinks";

interface LegalPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageShell({
  eyebrow,
  title,
  description,
  lastUpdated,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.28),transparent_60%)] pointer-events-none" />

          <div className="relative flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke landing page
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
                <ShieldCheck className="h-4 w-4" />
                Last updated {lastUpdated}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-200/80">{eyebrow}</p>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
              </div>
            </div>

            <article className="space-y-8 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 sm:p-8">
              {children}
            </article>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <p>SmartDesign Studio paid beta disclosure.</p>
              <PublicLegalLinks
                className="gap-5"
                linkClassName="text-slate-400 hover:text-white"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}