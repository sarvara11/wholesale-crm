# Wholesale CRM

Cloud-ready CRM module for a wholesale ready-made clothing company.
Part of a larger ERP / CRM / WMS cloud migration project.

**Stack:** Node.js · Express · MongoDB Atlas · Mongoose · JWT · Tailwind CSS · Chart.js · Docker

---

## Table of Contents

1. [Features](#features)
2. [Quick Start (local)](#quick-start-local)
3. [Environment Variables](#environment-variables)
4. [Running with Docker](#running-with-docker)
5. [Seeding the Database](#seeding-the-database)
6. [Project Structure](#project-structure)
7. [API Reference](#api-reference)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Load Balancing & Auto-Scaling](#load-balancing--auto-scaling)
10. [Security Notes](#security-notes)

---

## Features

| Area | Details |
|---|---|
| **Auth** | JWT stored in httpOnly cookie, bcrypt password hashing, rate-limited login |
| **RBAC** | Two roles: `manager` (super-admin) and `admin` (operational) — enforced on every API route |
| **Dashboards** | Role-specific KPI cards + Chart.js line / bar / donut charts wired to live data |
| **Modules** | Customers · Leads · Opportunities · Activities · Inventory · Reports · Audit Logs · User Management |
| **Theme** | Light / Dark toggle, persisted in `localStorage` |
| **Health check** | `GET /health` — uptime + timestamp for load-balancer probes |
| **Cloud-ready** | 12-factor config (env vars only), stateless JWT, Docker multi-stage image, auto-scaling compatible |

---

## Quick Start (local)

### Prerequisites
- Node.js ≥ 18
- A MongoDB Atlas cluster (or local `mongod`)

```bash
# 1. Clone / enter the project
cd crm-app

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — set MONGODB_URI and a strong JWT_SECRET

# 4. Seed the database
npm run seed

# 5. Start the dev server (hot-reload)
npm run dev
```

Open **http://localhost:3000** — you'll be redirected to the login page.

**Demo credentials (created by seed script):**

| Email | Password | Role |
|---|---|---|
| `manager@crm.test` | `Manager123!` | Manager (full access) |
| `admin@crm.test` | `Admin123!` | Admin (operational) |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in every value before running.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | yes | `development` or `production` |
| `PORT` | no | HTTP port (default `3000`) |
| `MONGODB_URI` | **yes** | Atlas connection string (`mongodb+srv://…`) |
| `JWT_SECRET` | **yes** | Long random string — generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | no | Token TTL (default `7d`) |
| `COOKIE_SECURE` | no | Set to `true` in production (requires HTTPS) |
| `CORS_ORIGINS` | no | Comma-separated allowed origins (e.g. `https://app.example.com`) |

> **Never commit `.env`** — it is listed in `.gitignore` and `.dockerignore`.

---

## Running with Docker

### One-command local run

```bash
# Build and start
docker-compose up --build

# Run in background
docker-compose up --build -d

# Stop
docker-compose down
```

The compose file reads `.env` automatically. The app is available at **http://localhost:3000**.

### Scale locally (simulate load-balancing)

```bash
docker-compose up --build --scale crm=3
```

> You need a reverse proxy (nginx, Traefik) in front to distribute traffic.
> Uncomment the `deploy.replicas` block in `docker-compose.yml` for Docker Swarm mode.

### Build image only

```bash
docker build -t wholesale-crm:latest .
```

### Run container directly

```bash
docker run -d \
  --name crm \
  -p 3000:3000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="your-secret" \
  -e NODE_ENV=production \
  -e COOKIE_SECURE=true \
  wholesale-crm:latest
```

---

## Seeding the Database

```bash
npm run seed
```

Re-running seed **wipes and recreates** all collections — safe to run multiple times.
Seed data includes: 2 users, 12 customers, 15 leads, 10 opportunities, 20 activities, 12 inventory items, ~40 audit log entries.

---

## Project Structure

```
crm-app/
├── server/
│   ├── config/db.js            # Mongoose connection
│   ├── controllers/            # Business logic (one file per entity)
│   ├── middleware/
│   │   ├── auth.js             # JWT verification → req.user
│   │   ├── rbac.js             # requireRole('manager','admin')
│   │   └── audit.js            # Fire-and-forget audit logger
│   ├── models/                 # Mongoose schemas (7 models)
│   ├── routes/                 # Express routers (9 route files)
│   └── index.js                # App entry point, /health endpoint
├── public/
│   ├── css/app.css             # Custom CSS (cards, buttons, table, pills)
│   ├── js/                     # Vanilla JS SPA (api, utils, 10 page modules)
│   ├── login.html
│   ├── app.html                # SPA shell (sidebar + topbar + content area)
│   └── index.html              # Auth probe → redirect
├── scripts/seed.js             # Database seed
├── .github/workflows/ci-cd.yml # GitHub Actions pipeline
├── Dockerfile                  # Multi-stage, node:20-alpine, non-root user
├── docker-compose.yml
├── .env.example
└── .dockerignore
```

---

## API Reference

All routes under `/api/` require a valid session cookie except `POST /api/auth/login`.

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Returns user + sets `token` cookie |
| POST | `/api/auth/logout` | Any | Clears cookie |
| GET  | `/api/auth/me` | Any | Returns current user |

### CRUD Entities (Customers, Leads, Opportunities, Activities, Inventory)
All follow the same pattern:

| Method | Path | Access |
|---|---|---|
| GET    | `/api/<entity>` | Manager + Admin |
| GET    | `/api/<entity>/:id` | Manager + Admin |
| POST   | `/api/<entity>` | Manager + Admin |
| PUT    | `/api/<entity>/:id` | Manager + Admin |
| DELETE | `/api/<entity>/:id` | Manager + Admin |

Special routes:
- `PATCH /api/customers/:id/assign` — Manager only
- `PATCH /api/activities/:id/complete` — Both roles

### Users
All `/api/users/*` — **Manager only**

### Audit Logs
`GET /api/audit-logs` — **Manager only**

### Reports
| Path | Access |
|---|---|
| `GET /api/reports/manager-dashboard` | Manager only |
| `GET /api/reports/admin-dashboard` | Both |
| `GET /api/reports/sales-pipeline` | Both |
| `GET /api/reports/lead-sources` | Both |
| `GET /api/reports/revenue-trend` | Manager only |

### Health Check
`GET /health` — Public, no auth required. Returns `{ status, uptime, timestamp }`.

---

## CI/CD Pipeline

The pipeline lives in `.github/workflows/ci-cd.yml` and runs on every push to `main` and every PR.

```
Push / PR to main
      │
      ▼
┌─────────────────┐
│  Job 1: Test    │  npm ci → eslint (0 errors) → npm test
└────────┬────────┘
         │ (only on push to main)
         ▼
┌─────────────────┐
│  Job 2: Build   │  docker buildx → push :latest + :<sha> → GHCR
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Job 3: Deploy  │  Placeholder — uncomment your cloud provider
└─────────────────┘  (ECS / Cloud Run / K8s / Render / Fly.io)
```

### Required GitHub secrets

Add these to your repo's **Settings → Secrets and variables → Actions**:

| Secret | Where used |
|---|---|
| `GITHUB_TOKEN` | Auto-provided by GitHub (GHCR login) |

Add these to the **`production` environment** (Settings → Environments):

| Secret | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `JWT_SECRET` | 64-char hex string |
| `COOKIE_SECURE` | `true` |
| `NODE_ENV` | `production` |

### Switching registries

To push to **Docker Hub** instead of GHCR, edit the `build` job:
1. Remove `registry: ghcr.io`
2. Set `username: ${{ secrets.DOCKERHUB_USERNAME }}` and `password: ${{ secrets.DOCKERHUB_TOKEN }}`
3. Update image tags to `docker.io/yourorg/wholesale-crm`

---

## Load Balancing & Auto-Scaling

### Why this app scales horizontally

The app is **stateless by design**:

- **No server-side sessions** — auth state lives entirely in the signed JWT cookie. Any replica can verify any request independently.
- **No in-process cache** — all data reads go to MongoDB Atlas. Replicas share nothing.
- **All config via environment variables** — the same Docker image runs in dev, staging, and production with different env vars.

### Deploying multiple replicas

Behind any HTTP load balancer (nginx, AWS ALB, GCP LB, K8s Ingress):

```
Client → Load Balancer (round-robin / least-connections)
               ├─ crm replica 1 :3000
               ├─ crm replica 2 :3000
               └─ crm replica 3 :3000
                         │
                    MongoDB Atlas
                   (shared, external)
```

The load balancer hits `GET /health` every 30 s to drain unhealthy instances automatically.

### Kubernetes example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wholesale-crm
spec:
  replicas: 3                         # start with 3
  selector:
    matchLabels: { app: crm }
  template:
    metadata:
      labels: { app: crm }
    spec:
      containers:
        - name: crm
          image: ghcr.io/yourorg/wholesale-crm:latest
          ports: [{ containerPort: 3000 }]
          envFrom:
            - secretRef: { name: crm-secrets }   # MONGODB_URI, JWT_SECRET …
          livenessProbe:
            httpGet: { path: /health, port: 3000 }
            initialDelaySeconds: 10
            periodSeconds: 30
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: crm-hpa
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: wholesale-crm }
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

### AWS ECS / Fargate

Set desired count to 2+ tasks, enable Application Auto Scaling on ECS service, and point the ALB health-check target group to `GET /health`.

### GCP Cloud Run

Cloud Run auto-scales to zero by default. Set `--min-instances=1` to avoid cold starts and `--max-instances=20` for budget control.

---

## Security Notes

- Passwords hashed with **bcrypt** (cost factor 12)
- JWT signed with `HS256`, stored in **httpOnly, SameSite=Lax** cookie — not readable by JavaScript
- **Helmet** sets secure HTTP headers (CSP, HSTS in production, X-Frame-Options, etc.)
- **Rate limiting**: auth routes 20 req/15 min, API 200 req/min (per IP)
- **RBAC** enforced server-side on every protected route — frontend visibility is UX-only
- `.env` is excluded from Docker image via `.dockerignore`
- Container runs as non-root user `appuser`
- For production, set `COOKIE_SECURE=true` and run behind TLS (nginx/cloud LB)
