"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Bot, CreditCard, Loader2, MessageSquare, RefreshCw, Users, WalletCards } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api/coreApi";

type StatusMap = Record<string, number>;

interface OperationSummary {
  operation: string;
  count: number;
  credits_charged: number;
  actual_cost: number;
  estimated_cost: number;
}

interface RecentFailure {
  id: string;
  user_id: string;
  job_id: string | null;
  ai_tool_job_id: string | null;
  operation: string;
  status: string;
  credits_charged: number;
  error_code: string | null;
  error_message: string | null;
  created_at: string | null;
}

interface RecentFeedback {
  id: string;
  user_id: string;
  design_id: string | null;
  job_id: string | null;
  rating: number;
  helpful: boolean | null;
  source: string;
  export_format: string | null;
  note: string | null;
  created_at: string | null;
}

interface WeeklyFunnelMetric {
  count: number | null;
  rate_percent: number | null;
  note?: string;
}

interface WeeklyBetaReview {
  window_days: number;
  funnel: {
    visitor_to_signup: WeeklyFunnelMetric;
    signup_to_first_design: WeeklyFunnelMetric;
    first_design_to_generation: WeeklyFunnelMetric;
    generation_to_export: WeeklyFunnelMetric;
    export_to_payment: WeeklyFunnelMetric;
    payment_to_repeat_use: WeeklyFunnelMetric;
  };
  cost: {
    ai_actual_cost_7d: number;
    paying_users_30d: number;
    ai_cost_per_paying_user: number;
  };
}

interface OperatorSummary {
  generated_at: string;
  users: {
    total: number;
    new_7d: number;
  };
  jobs: {
    design_by_status: StatusMap;
    ai_tool_by_status: StatusMap;
    pending_work: {
      design_jobs: number;
      ai_tool_jobs: number;
    };
  };
  ai_usage: {
    by_status: StatusMap;
    last_7d: {
      event_count: number;
      credits_charged: number;
      actual_cost: number;
      estimated_cost: number;
      by_operation: OperationSummary[];
    };
    recent_failures: RecentFailure[];
  };
  credits: {
    consumed_7d: number;
    refunded_7d: number;
  };
  payments: {
    storage_by_status: StatusMap;
    storage_revenue_30d_idr: number;
  };
  feedback: {
    count_7d: number;
    average_rating_7d: number;
    recent: RecentFeedback[];
  };
  weekly_beta_review: WeeklyBetaReview;
}

const TOKEN_STORAGE_KEY = "smartdesign_operator_token";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatCurrencyIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

function StatTile({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function StatusList({ items }: { items: StatusMap }) {
  const entries = Object.entries(items);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada data.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([status, count]) => (
        <div key={status} className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{status}</span>
          <span className="font-semibold">{formatNumber(count)}</span>
        </div>
      ))}
    </div>
  );
}

function formatRate(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(2)}%`;
}

export default function OperatorDashboardPage() {
  const [token, setToken] = useState("");
  const [summary, setSummary] = useState<OperatorSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_STORAGE_KEY) || "");
  }, []);

  const hasToken = token.trim().length > 0;

  const loadSummary = useCallback(async (nextToken = token) => {
    const trimmed = nextToken.trim();
    if (!trimmed) {
      setError("Masukkan internal token.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/internal/operator-summary`, {
        headers: {
          "X-Internal-Token": trimmed,
        },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.detail || payload?.detail || "Gagal memuat operator summary.");
      }
      const data = (await response.json()) as OperatorSummary;
      setSummary(data);
      localStorage.setItem(TOKEN_STORAGE_KEY, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat operator summary.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loadSummary();
  };

  const generatedAt = useMemo(() => {
    if (!summary?.generated_at) return null;
    return new Date(summary.generated_at).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [summary?.generated_at]);

  return (
    <div className="min-h-screen bg-background/50">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Operator Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Paid beta health, usage, billing, and failure visibility.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:max-w-md sm:flex-row">
            <Input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Internal token"
              autoComplete="off"
            />
            <Button type="submit" disabled={loading || !hasToken}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
          </form>
        </div>

        {error ? (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {!summary ? (
          <div className="mt-12 rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            Masukkan token internal untuk melihat ringkasan operator.
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatTile
                label="Users"
                value={formatNumber(summary.users.total)}
                helper={`+${formatNumber(summary.users.new_7d)} dalam 7 hari`}
                icon={Users}
              />
              <StatTile
                label="AI Usage 7D"
                value={formatNumber(summary.ai_usage.last_7d.event_count)}
                helper={`${formatNumber(summary.ai_usage.last_7d.credits_charged)} credits charged`}
                icon={Bot}
              />
              <StatTile
                label="Credit Net 7D"
                value={formatNumber(summary.credits.consumed_7d - summary.credits.refunded_7d)}
                helper={`${formatNumber(summary.credits.refunded_7d)} refunded`}
                icon={WalletCards}
              />
              <StatTile
                label="Storage Revenue 30D"
                value={formatCurrencyIdr(summary.payments.storage_revenue_30d_idr)}
                helper={generatedAt ? `Updated ${generatedAt}` : undefined}
                icon={CreditCard}
              />
              <StatTile
                label="Feedback 7D"
                value={formatNumber(summary.feedback.count_7d)}
                helper={`Avg ${summary.feedback.average_rating_7d.toFixed(1)} / 5`}
                icon={MessageSquare}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <section className="rounded-lg border bg-card p-5">
                <h2 className="text-sm font-semibold">Design Jobs</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pending: {formatNumber(summary.jobs.pending_work.design_jobs)}
                </p>
                <div className="mt-4">
                  <StatusList items={summary.jobs.design_by_status} />
                </div>
              </section>

              <section className="rounded-lg border bg-card p-5">
                <h2 className="text-sm font-semibold">AI Tool Jobs</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pending: {formatNumber(summary.jobs.pending_work.ai_tool_jobs)}
                </p>
                <div className="mt-4">
                  <StatusList items={summary.jobs.ai_tool_by_status} />
                </div>
              </section>

              <section className="rounded-lg border bg-card p-5">
                <h2 className="text-sm font-semibold">Payments</h2>
                <p className="mt-1 text-xs text-muted-foreground">Storage purchase status</p>
                <div className="mt-4">
                  <StatusList items={summary.payments.storage_by_status} />
                </div>
              </section>
            </div>

            <section className="rounded-lg border bg-card p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Weekly Beta Review Funnel</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ringkasan konversi utama untuk review mingguan beta.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI Cost/Paying User: {formatUsd(summary.weekly_beta_review.cost.ai_cost_per_paying_user)}
                </p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Metric</th>
                      <th className="pb-2 pr-4 font-medium">Count</th>
                      <th className="pb-2 pr-4 font-medium">Rate</th>
                      <th className="pb-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        ["Visitor -> Signup", summary.weekly_beta_review.funnel.visitor_to_signup],
                        ["Signup -> First Design", summary.weekly_beta_review.funnel.signup_to_first_design],
                        ["First Design -> Generation", summary.weekly_beta_review.funnel.first_design_to_generation],
                        ["Generation -> Export", summary.weekly_beta_review.funnel.generation_to_export],
                        ["Export -> Payment", summary.weekly_beta_review.funnel.export_to_payment],
                        ["Payment -> Repeat Use", summary.weekly_beta_review.funnel.payment_to_repeat_use],
                      ] as [string, WeeklyFunnelMetric][]
                    ).map(([label, funnelMetric]) => {
                      return (
                        <tr key={label} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{label}</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {funnelMetric.count === null ? "-" : formatNumber(funnelMetric.count)}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{formatRate(funnelMetric.rate_percent)}</td>
                          <td className="py-3 text-muted-foreground">{funnelMetric.note || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border bg-card p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">AI Usage By Operation</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    7-day credit and cost view from `ai_usage_events`.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Actual {formatUsd(summary.ai_usage.last_7d.actual_cost)} / Est. {formatUsd(summary.ai_usage.last_7d.estimated_cost)}
                </p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Operation</th>
                      <th className="pb-2 pr-4 font-medium">Count</th>
                      <th className="pb-2 pr-4 font-medium">Credits</th>
                      <th className="pb-2 pr-4 font-medium">Actual Cost</th>
                      <th className="pb-2 font-medium">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.ai_usage.last_7d.by_operation.map((item) => (
                      <tr key={item.operation} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{item.operation}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatNumber(item.count)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatNumber(item.credits_charged)}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatUsd(item.actual_cost)}</td>
                        <td className="py-3 text-muted-foreground">{formatUsd(item.estimated_cost)}</td>
                      </tr>
                    ))}
                    {summary.ai_usage.last_7d.by_operation.length === 0 ? (
                      <tr>
                        <td className="py-4 text-muted-foreground" colSpan={5}>Belum ada usage event.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border bg-card p-5">
              <h2 className="text-sm font-semibold">Recent Failures & Refunds</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">When</th>
                      <th className="pb-2 pr-4 font-medium">Operation</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 pr-4 font-medium">Credits</th>
                      <th className="pb-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.ai_usage.recent_failures.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 text-muted-foreground">
                          {item.created_at ? new Date(item.created_at).toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="py-3 pr-4 font-medium">{item.operation}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{item.status}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{formatNumber(item.credits_charged)}</td>
                        <td className="max-w-md py-3 text-muted-foreground">
                          <span className="line-clamp-2">{item.error_code || item.error_message || "-"}</span>
                        </td>
                      </tr>
                    ))}
                    {summary.ai_usage.recent_failures.length === 0 ? (
                      <tr>
                        <td className="py-4 text-muted-foreground" colSpan={5}>Belum ada failure/refund terbaru.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border bg-card p-5">
              <h2 className="text-sm font-semibold">Recent Export Feedback</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">When</th>
                      <th className="pb-2 pr-4 font-medium">Rating</th>
                      <th className="pb-2 pr-4 font-medium">Helpful</th>
                      <th className="pb-2 pr-4 font-medium">Format</th>
                      <th className="pb-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.feedback.recent.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 text-muted-foreground">
                          {item.created_at ? new Date(item.created_at).toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="py-3 pr-4 font-medium">{item.rating}/5</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {item.helpful === null ? "-" : item.helpful ? "yes" : "no"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{item.export_format || "-"}</td>
                        <td className="max-w-md py-3 text-muted-foreground">
                          <span className="line-clamp-2">{item.note || "-"}</span>
                        </td>
                      </tr>
                    ))}
                    {summary.feedback.recent.length === 0 ? (
                      <tr>
                        <td className="py-4 text-muted-foreground" colSpan={5}>Belum ada feedback export.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
