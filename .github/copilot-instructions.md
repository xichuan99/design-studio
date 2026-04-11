# GitHub Copilot Instructions — Design Studio

> Dikurasi dari [github/awesome-copilot](https://github.com/github/awesome-copilot), disesuaikan dengan stack proyek ini.

---

## 🏗️ Stack Proyek

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 16.1.6 (App Router), React 19, TypeScript 5, Tailwind CSS v4 |
| UI Components | shadcn/ui, Radix UI, Lucide React |
| Canvas Editor | React Konva, Konva.js |
| State Management | Zustand v5 |
| Auth | next-auth v4 |
| Monitoring | - |
| Backend | FastAPI 0.115+, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| AI/Worker | Quantum Engine (FastAPI terpisah), Celery, fal_client |
| Infra | Docker, docker-compose |
| Testing | Playwright (E2E), pytest, Storybook |
| CI/CD | GitHub Actions |

---

## 🔵 Next.js — Frontend

_Source: [nextjs.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/nextjs.instructions.md)_

### Struktur & Organisasi
- Gunakan **App Router** (`app/`) untuk semua kode baru. Jangan gunakan `pages/`.
- Semua source code ada di dalam `src/` — folder top-level di dalamnya: `app/`, `components/`, `hooks/`, `lib/`, `store/`.
- **Tidak ada** folder `contexts/` — gunakan Zustand (`store/`) untuk shared state.
- Colocation: letakkan komponen, test, dan style dekat dengan route yang memakainya.
- Gunakan **Route Groups** `(group)` untuk mengelompokkan route tanpa memengaruhi URL.

### Server vs Client Component
- **Server Components** adalah default — gunakan untuk data fetching dan logika berat.
- Tambahkan `'use client'` **hanya** jika komponen membutuhkan interaktivitas, state, atau browser API.
- **Jangan** gunakan `next/dynamic` dengan `{ ssr: false }` di dalam Server Component.
- Pisahkan logika client-only ke Client Component tersendiri, lalu import ke Server Component.

### Next.js 16+ Async APIs
- `cookies()`, `headers()`, dan `draftMode()` bersifat **async** — selalu `await`.
- `params` dan `searchParams` pada Server Component bisa berupa Promise — gunakan `await`.
- Isolasi bagian dinamis di balik `Suspense` untuk menghindari dynamic rendering yang tidak sengaja.

### API Routes
- Letakkan di `app/api/` (contoh: `app/api/users/route.ts`).
- Export fungsi async bernama sesuai HTTP verb: `GET`, `POST`, `PUT`, `DELETE`.
- **Jangan** memanggil Route Handler sendiri dari Server Component — ekstrak logika ke `lib/`.
- Selalu validasi input dengan **Zod**.

### TypeScript & Code Style
- `strict: true` sudah aktif di `tsconfig.json` — jangan dinonaktifkan.
- `PascalCase` untuk komponen dan tipe, `camelCase` untuk hooks dan utilitas, `UPPER_SNAKE_CASE` untuk konstanta.
- Gunakan TypeScript interface untuk props komponen.
- **Jangan** buat file contoh/demo (seperti `ModalExample.tsx`) di codebase utama kecuali diminta.

### UI Components — shadcn/ui + Radix UI
- Gunakan komponen dari **shadcn/ui** sebagai basis (sudah ada di `components/ui/`).
- Instalasi komponen baru via `npx shadcn@latest add <component>`, bukan copy-paste manual.
- Gunakan **Radix UI** primitives langsung jika komponen shadcn tidak tersedia.
- Gunakan `clsx` + `tailwind-merge` (`cn()` helper) untuk conditional class.

### Styling — Tailwind CSS v4
- Proyek menggunakan **Tailwind v4** — konfigurasinya berbeda dari v3:
  - **Tidak ada** `tailwind.config.js/ts` — konfigurasi tema dilakukan di CSS via `@theme {}`.
  - PostCSS plugin: `@tailwindcss/postcss` (bukan `tailwindcss` langsung).
  - Import di CSS: `@import "tailwindcss"` (bukan `@tailwind base/components/utilities`).
- Jangan generate atau edit `tailwind.config.js` — itu adalah pola v3 yang sudah tidak dipakai.

### State Management — Zustand
- Semua global state dikelola dengan **Zustand** (`store/`).
- Buat satu file store per domain (contoh: `store/editorStore.ts`, `store/authStore.ts`).
- Jangan gunakan React Context untuk state global — gunakan Zustand.

### Canvas Editor — React Konva
- Canvas rendering menggunakan **React Konva** dan **Konva.js**.
- Gunakan `react-konva-utils` untuk utilitas tambahan (mis. `Html` component).
- Handle event canvas secara eksplisit — hindari re-render yang tidak perlu pada `Stage`.

### Performance & Caching
- Gunakan `use cache` directive dan `cacheTag` / `cacheLife` untuk memoization (Next.js 16).
- Hindari `unstable_cache` pada kode baru.
- Optimalkan image dengan `next/image`, font dengan `next/font`.
- Turbopack adalah default bundler dev — konfigurasi via field `turbopack` di `next.config.*`.

### Storybook
- Komponen UI yang reusable sebaiknya memiliki story di Storybook.
- Jalankan dengan `npm run storybook` (port 6006).
- Gunakan `@storybook/nextjs` renderer — bukan `@storybook/react` secara langsung.

### Environment Variables
- Simpan secrets di `.env.local`. **Jangan commit secrets.**
- `NEXT_PUBLIC_*` di-inline saat build time — ubahan setelah build tidak berpengaruh.
- `NEXT_PUBLIC_BUILD_ID` diset oleh GitHub Actions CI untuk cache consistency.

### Monitoring
- Gunakan logging sistem yang terstruktur untuk melacak error.
- Jangan tambahkan `try/catch` yang hanya menelan error tanpa logging.

### Auth — next-auth
- Menggunakan **next-auth v4** — session diakses via `useSession()` (client) atau `getServerSession()` (server).
- Route protection dilakukan di `src/middleware.ts`.
- Jangan simpan sensitive data di session client-side.

---

## 🟢 Python / FastAPI — Backend

### Prinsip Umum
- Gunakan **type hints** di semua fungsi dan class.
- Gunakan **Pydantic v2** untuk validasi request/response schema.
- Pisahkan lapisan: `api/` (router), `services/` (business logic), `models/` (DB), `schemas/` (Pydantic).
- Gunakan `async def` untuk endpoint I/O-bound; gunakan `def` biasa untuk logika CPU-bound.

### Database (SQLAlchemy + Alembic)
- Gunakan **parameterized query** — **jangan pernah** string concatenation untuk query DB.
- Gunakan **Alembic** untuk semua migrasi skema. Jangan modifikasi tabel langsung.
- Atur koneksi DB lewat environment variable (`DATABASE_URL`), bukan hardcode.

### Error Handling
- Gunakan `HTTPException` dengan status code yang tepat.
- Log error dengan level yang sesuai (`logger.error`, `logger.warning`).
- Jangan expose stack trace ke response produksi.

### Testing
- Gunakan **pytest** dengan `pytest-asyncio` untuk endpoint async.
- Buat fixture untuk test DB yang terisolasi (jangan pakai DB produksi).
- Minimal coverage untuk: endpoint, service logic, dan edge case.

---

## 🐳 Docker & docker-compose

_Source: [containerization-docker-best-practices.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/containerization-docker-best-practices.instructions.md)_

### Dockerfile
- Selalu gunakan **multi-stage build** untuk memisahkan build-time dan runtime dependencies.
- Gunakan image minimal: `python:3.11-slim`, `node:20-alpine`.
- **Jangan** gunakan tag `latest` di produksi — pin ke versi spesifik.
- Letakkan instruksi yang jarang berubah (install deps) **sebelum** yang sering berubah (copy source).
- Gabungkan `RUN` commands untuk meminimalkan layer: `RUN apt-get update && apt-get install -y ... && rm -rf /var/lib/apt/lists/*`.
- Jalankan container sebagai **non-root user**.
- Definisikan `HEALTHCHECK` untuk setiap service.

### .dockerignore
Selalu buat `.dockerignore` yang komprehensif:
```
.git*
node_modules
__pycache__
.env.*
*.log
dist
build
coverage
.vscode
.DS_Store
```

### docker-compose
- Gunakan **named networks** untuk isolasi service (`frontend`, `backend`).
- Set **resource limits** (`cpus`, `memory`) untuk semua service.
- Gunakan **named volumes** untuk data persisten (bukan bind mount ke host).
- **Jangan** hardcode secrets di `docker-compose.yml` — gunakan `.env` file atau Docker Secrets.

---

## 🛡️ Security (OWASP Top 10)

_Source: [security-and-owasp.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/security-and-owasp.instructions.md)_

### Prinsip Utama
- **Security-first mindset**: selalu pilih opsi yang lebih aman dan jelaskan alasannya.
- **Deny by default**: akses hanya diberikan jika ada aturan eksplisit yang mengizinkan.

### Inject Prevention (A03)
- **Jangan pernah** gunakan string concatenation/formatting untuk membangun SQL query dari input user.
- Gunakan parameterized query / ORM yang aman.
- Untuk eksekusi command OS, gunakan fungsi yang menangani argument escaping (mis. `shlex` di Python).
- Frontend: gunakan `.textContent` bukan `.innerHTML`; jika terpaksa pakai `innerHTML`, sanitasi dulu dengan DOMPurify.

### Secrets & Cryptography (A02)
- **Jangan hardcode** API keys, passwords, atau connection strings di kode.
- Baca secrets dari environment variable atau secrets manager.
- Gunakan **bcrypt/Argon2** untuk hash password. Jangan MD5 atau SHA-1.
- Default ke HTTPS untuk semua network request.

### Access Control (A01)
- Terapkan **Principle of Least Privilege** untuk semua akses.
- Validasi hak akses di server-side — jangan percaya input client.
- Validasi semua URL eksternal (webhook, dsb.) menggunakan allow-list.

### Session & Auth (A07)
- Cookie session harus: `HttpOnly`, `Secure`, `SameSite=Strict`.
- Implementasikan **rate limiting** dan **account lockout** untuk endpoint login.

### HTTP Security Headers
Pastikan response API/frontend menyertakan:
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options`

---

## 🎭 Playwright — E2E Testing

_Source: [playwright-typescript.instructions.md](https://github.com/github/awesome-copilot/blob/main/instructions/playwright-typescript.instructions.md)_

### Locators
- Prioritaskan **role-based locators**: `getByRole`, `getByLabel`, `getByText`, `getByTestId`.
- Hindari locator berbasis CSS class atau XPath yang rapuh.

### Assertions
- Gunakan **web-first assertions** yang auto-retry: `await expect(locator).toHaveText()`.
- Hindari `expect(locator).toBeVisible()` kecuali memang testing perubahan visibilitas.
- Jangan gunakan hard-coded `waitForTimeout()` — andalkan auto-waiting Playwright.

### Struktur Test
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
  });

  test('Feature - specific scenario', async ({ page }) => {
    await test.step('Action description', async () => {
      // interaksi
    });
    await test.step('Verify result', async () => {
      // assertions
    });
  });
});
```

### Konvensi File
- Simpan semua test di `tests/e2e/`.
- Nama file: `<feature>.spec.ts` (contoh: `auth.spec.ts`, `editor.spec.ts`).
- Satu file per fitur/page utama.

---

## ⚙️ GitHub Actions / CI-CD

### Prinsip Umum
- **Pin actions ke SHA immutable**, bukan tag yang bisa berubah:
  ```yaml
  # ✅ AMAN
  uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
  # ❌ HINDARI
  uses: actions/checkout@v4
  ```
- Pisahkan job: `lint`, `test`, `build`, `deploy` — jangan satu job monolitik.
- Gunakan **secrets GitHub** untuk credentials, bukan environment variable di YAML.
- Set **timeout** untuk setiap job agar pipeline tidak hang selamanya.

---

## 🎯 Skills yang Tersedia

Skills berikut tersedia di `.github/skills/` — panggil dengan menyebutkan nama skill saat meminta bantuan:

| Skill | Kapan Dipakai |
|---|---|
| `conventional-commit` | Buat pesan git commit yang terstandarisasi |
| `refactor` | Perbaiki struktur kode tanpa mengubah perilaku |
| `pytest-coverage` | Jalankan coverage dan tambah test hingga 100% |
| `playwright-generate-test` | Generate E2E test Playwright dari skenario |
| `postgresql-optimization` | Optimasi query SQL, indexing, dan schema review |
| `multi-stage-dockerfile` | Buat Dockerfile multi-stage yang optimal dan aman |
| `create-implementation-plan` | Buat rencana implementasi fitur baru secara terstruktur |

**Cara memanggil:** _"Gunakan skill `refactor` untuk membersihkan file ini"_ atau _"Pakai `create-implementation-plan` untuk fitur X"_

---

## 📐 Aturan Umum Copilot

1. **Jangan buat file dokumentasi baru** setelah selesai mengerjakan perubahan kode kecuali diminta.
2. **Selalu gunakan absolute path** saat memanggil tool yang menerima file path.
3. Jika ada beberapa perubahan independen, **lakukan serentak** (bukan berurutan).
4. Baca konteks yang cukup sebelum membuat asumsi.
5. **Jangan expose stack trace** ke user — log di server, tampilkan pesan generik ke client.
6. Ketika menambahkan dependency baru, selalu pertimbangkan **security** (`npm audit`, `pip-audit`).
