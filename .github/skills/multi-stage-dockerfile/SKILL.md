---
name: multi-stage-dockerfile
description: 'Create optimized multi-stage Dockerfiles for Next.js frontend and FastAPI backend. Smaller images, non-root user, healthcheck, pinned versions.'
---

## Goal

Produce a secure, minimal, production-ready Dockerfile using multi-stage builds.

## Rules

- Use **multi-stage builds**: separate `deps`, `build`, `runtime` stages.
- Pin base image versions — never use `latest` in production.
  - Frontend: `node:20-alpine`
  - Backend: `python:3.11-slim`
- Run as **non-root user**.
- Include `HEALTHCHECK`.
- Use `.dockerignore` to exclude unnecessary files.
- Copy dependency files **before** source code to leverage layer caching.
- Combine `RUN` commands with `&&` to minimize layers.

## Frontend Template (Next.js)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["node", "server.js"]
```

## Backend Template (FastAPI)

```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
COPY --from=builder /root/.local /root/.local
COPY app/ ./app/
ENV PATH=/root/.local/bin:$PATH
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## .dockerignore (tambahkan ke setiap service)

```
.git*
node_modules
__pycache__
*.pyc
.env.*
*.log
dist
build
coverage
.vscode
.DS_Store
tests/
```

## Checklist

- [ ] Multi-stage build dipakai
- [ ] Versi base image di-pin (tidak `latest`)
- [ ] `COPY` dependency file sebelum source code
- [ ] `RUN` commands digabung dengan `&&`
- [ ] Non-root USER didefinisikan
- [ ] HEALTHCHECK ada
- [ ] `.dockerignore` komprehensif

Source: [github/awesome-copilot — multi-stage-dockerfile](https://github.com/github/awesome-copilot/tree/main/skills/multi-stage-dockerfile)
