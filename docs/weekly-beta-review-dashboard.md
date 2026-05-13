# Weekly Beta Review Dashboard

Last updated: 2026-05-12

Dokumen ini menyiapkan query dan susunan dashboard review mingguan untuk paid beta.

## Scope

Target metrik weekly review:
- visitor to signup
- signup to first design
- first design to export
- export to payment
- payment to repeat use
- AI cost per paying user

## Data Sources

- Backend analytics event stream: `landing_viewed` -> `signup_completed`.
- Postgres backend: users/projects/ai usage/payment/export feedback.
- API internal dashboard: `GET /api/internal/operator-summary`.

## Dashboard Layout (Recommended)

1. Funnel card (weekly):
- Visitor -> Signup (backend analytics + PostHog mirror)
- Signup -> First Design (backend)
- First Design -> Generation (backend)
- Generation -> Export (backend-owned export event)
- Export -> Payment (backend)
- Payment -> Repeat Use (backend)

2. Unit economics card:
- AI actual cost 7D
- Paying users 30D
- AI cost per paying user

3. QA notes card:
- Export di backend sekarang dibaca dari `design_exports`.
- Visitor disediakan dari `analytics_events` backend, dengan mirror PostHog tetap aktif untuk landing experiment.

## Query A: Backend Analytics (Visitor -> Signup)

Gunakan query Postgres berikut:

```sql
WITH visitors AS (
  SELECT DISTINCT visitor_id
  FROM analytics_events
  WHERE event_name = 'landing_viewed'
    AND created_at >= now() - interval '7 days'
),
signups AS (
  SELECT DISTINCT visitor_id
  FROM analytics_events
  WHERE event_name = 'signup_completed'
    AND created_at >= now() - interval '7 days'
),
converted AS (
  SELECT DISTINCT v.visitor_id
  FROM visitors v
  JOIN signups s ON s.visitor_id = v.visitor_id
)
SELECT
  (SELECT count(*) FROM visitors) AS visitors,
  (SELECT count(*) FROM signups) AS signups,
  (SELECT count(*) FROM converted) AS converted,
  round(100.0 * (SELECT count(*) FROM converted) / nullif((SELECT count(*) FROM visitors), 0), 2) AS visitor_to_signup_rate;
```

Catatan operasional:
1. `landing_viewed` dikirim dari landing page ke backend analytics sink dan tetap dicerminkan ke PostHog untuk eksperimen landing.
2. `signup_completed` dikirim dari register page untuk credentials, atau dari callback `/projects` setelah Google OAuth berhasil.
3. Jika weekly review dijalankan tanpa akses dashboard, ambil angka `visitors`, `signups`, `converted`, dan `visitor_to_signup_rate` dari query ini atau dari `GET /api/internal/operator-summary`.

Catatan tambahan:
1. Untuk review mingguan, backend analytics event stream adalah source of truth; PostHog tetap dipakai untuk eksperimen landing dan observability tambahan.

## Query B: Postgres (Weekly Funnel + Cost)

Query ini bisa dijalankan di Postgres untuk summary mingguan backend:

```sql
WITH signup_users AS (
  SELECT id, created_at
  FROM users
  WHERE created_at >= now() - interval '7 days'
),
first_design_users AS (
  SELECT DISTINCT p.user_id
  FROM projects p
  JOIN signup_users su ON su.id = p.user_id
),
generated_users AS (
  SELECT DISTINCT a.user_id
  FROM ai_usage_events a
  JOIN signup_users su ON su.id = a.user_id
  WHERE a.created_at >= now() - interval '7 days'
    AND a.status IN ('charged', 'succeeded', 'completed', 'refunded')
),
exported_users AS (
  SELECT DISTINCT f.user_id
  FROM design_feedback f
  JOIN signup_users su ON su.id = f.user_id
  WHERE f.created_at >= now() - interval '7 days'
    AND f.source = 'export'
),
paying_users_30d AS (
  SELECT DISTINCT sp.user_id
  FROM storage_purchases sp
  WHERE sp.status = 'paid'
    AND sp.paid_at >= now() - interval '30 days'
),
repeat_paying_users_30d AS (
  SELECT a.user_id
  FROM ai_usage_events a
  JOIN paying_users_30d pu ON pu.user_id = a.user_id
  WHERE a.created_at >= now() - interval '30 days'
    AND a.status IN ('charged', 'succeeded', 'completed', 'refunded')
  GROUP BY a.user_id
  HAVING count(DISTINCT date(a.created_at)) >= 2
),
cost_7d AS (
  SELECT coalesce(sum(actual_cost), 0) AS ai_actual_cost_7d
  FROM ai_usage_events
  WHERE created_at >= now() - interval '7 days'
)
SELECT
  (SELECT count(*) FROM signup_users) AS signups_7d,
  (SELECT count(*) FROM first_design_users) AS signup_to_first_design_users,
  (SELECT round(100.0 * count(*) / nullif((SELECT count(*) FROM signup_users), 0), 2) FROM first_design_users) AS signup_to_first_design_rate,
  (SELECT count(*) FROM generated_users) AS first_design_to_generation_users,
  (SELECT round(100.0 * count(*) / nullif((SELECT count(*) FROM first_design_users), 0), 2) FROM generated_users) AS first_design_to_generation_rate,
  (SELECT count(*) FROM exported_users) AS generation_to_export_users,
  (SELECT round(100.0 * count(*) / nullif((SELECT count(*) FROM generated_users), 0), 2) FROM exported_users) AS generation_to_export_rate,
  (SELECT count(*) FROM paying_users_30d) AS paying_users_30d,
  (SELECT count(*) FROM repeat_paying_users_30d) AS payment_to_repeat_use_users,
  (SELECT round(100.0 * count(*) / nullif((SELECT count(*) FROM paying_users_30d), 0), 2) FROM repeat_paying_users_30d) AS payment_to_repeat_use_rate,
  (SELECT ai_actual_cost_7d FROM cost_7d) AS ai_actual_cost_7d,
  round(
    (SELECT ai_actual_cost_7d FROM cost_7d) / nullif((SELECT count(*) FROM paying_users_30d), 0),
    4
  ) AS ai_cost_per_paying_user;
```

## Operational Cadence (Weekly)

- Senin pagi: refresh `/operator` dan PostHog funnel board.
- Catat delta vs minggu lalu untuk 6 metrik inti.
- Tandai 1 bottleneck utama funnel + 1 eksperimen perbaikan.
- Review lagi Jumat untuk early signal.
