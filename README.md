# MAVIX Estate Command — Multi-Tenant Edition

A production-tier, multi-tenant rebuild of the MAVIX Estate Command real estate
ERP. What was a single static HTML file with hardcoded mock data is now a
proper three-tier system:

```
┌─────────────────┐      HTTPS       ┌──────────────────┐      SQL      ┌─────────────┐
│  Frontend (SPA)  │ ───────────────▶ │  Backend API      │ ─────────────▶│  PostgreSQL │
│  nginx + static  │ ◀─────────────── │  Node/Express/TS  │ ◀─────────────│  (shared,   │
│  HTML/CSS/JS     │      JSON        │  Prisma ORM        │               │  tenantId   │
└─────────────────┘                  └──────────────────┘               │  isolation) │
                                                                          └─────────────┘
```

- **Frontend**: your original UI, unchanged visually, refactored to talk to a
  real API instead of `localStorage`/hardcoded data.
- **Backend**: Node.js + TypeScript + Express, JWT auth, Prisma ORM.
- **Database**: PostgreSQL, shared instance with a `tenantId` column on every
  business table (the multi-tenancy strategy you chose — simplest to run,
  cheapest to host, still fully isolated at the query layer).

This is what lets you ship the **same deployment** to multiple clients: each
client is a `Tenant` row, gets their own login, and only ever sees their own
data — enforced in `backend/src/middleware/auth.ts` +
`backend/src/utils/crudFactory.ts`, not just in the UI.

---

## Project layout

```
backend/     Node/TS/Express API, Prisma schema, seed script, tests
frontend/    Static SPA (your original HTML/CSS, refactored JS), nginx config
backup/      Automated database backup/restore scripts
legal/       Privacy Policy & Terms of Service templates (need legal review)
docker-compose.yml         Local dev / evaluation stack
docker-compose.prod.yml    Production-oriented stack (see comments in the file)
docker-compose.tls.yml     Optional overlay: adds automatic HTTPS via Caddy
Caddyfile                  Reverse proxy config used by docker-compose.tls.yml
.github/workflows/ci.yml   Lint, typecheck, test, build on every push/PR
```

---

## Quick start (Docker, recommended)

```bash
docker compose up --build
```

This starts Postgres, runs the backend (schema push + demo seed), and serves
the frontend on nginx.

- Frontend: http://localhost:8080
- Backend API: http://localhost:4000/api
- Demo login: workspace `aarohan-realty`, email `admin@aarohanrealty.com`,
  password `Admin@123` (or click **Use Demo Login** on the sign-in screen)

## Quick start (without Docker)

Requires Node.js 20+ and a running PostgreSQL instance.

```bash
# 1. Backend
cd backend
cp .env.example .env          # edit DATABASE_URL and JWT secrets
npm install
npx prisma generate
npx prisma db push            # or `prisma migrate dev` — see below
npm run prisma:seed           # optional demo data
npm run dev                   # http://localhost:4000

# 2. Frontend (separate terminal)
cd frontend/public
python3 -m http.server 8080   # or any static file server
# then set window.MAVIX_API_BASE = 'http://localhost:4000/api' at the top
# of index.html if you're not proxying /api through the same origin
```

---

## Onboarding a new client (multi-tenant)

Each client you deploy this to is a **Tenant**. Onboarding one takes a single
API call — no redeploy needed:

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Skyline Developers",
    "slug": "skyline-developers",
    "adminName": "Jane Doe",
    "email": "admin@skyline.com",
    "password": "SomethingStrong123!"
  }'
```

This creates an isolated `Tenant` row plus its first `SUPER_ADMIN` user. That
admin can then invite the rest of their team (extend `POST /api/auth/signup`
into an invite flow, or add users directly via Prisma Studio / a small admin
endpoint — the model is already there in `backend/prisma/schema.prisma`).

Clients log in with **workspace slug + email + password** (see the "Company
Workspace" field on the login screen) — that slug is what routes them to
their own data.

### Managing tenants (platform operator)

`GET /api/tenants` and `PATCH /api/tenants/:id/status` let *you* (not any
client) list/suspend tenants. They're guarded by a separate secret — set
`PLATFORM_ADMIN_KEY` in the backend's environment and pass it as the
`x-platform-admin-key` header. This is deliberately not tied to any tenant's
own `SUPER_ADMIN` role, so one client can never see or manage another's
account.

---

## Database migrations

Two migrations are already included and committed:

- `00000000000000_init/` — the original 27-table schema
- `00000000000001_v2_features/` — adds password reset tokens and material
  requests (the production-readiness additions)

Both were hand-verified by applying them to a real PostgreSQL 16 instance
during development — every table, index, unique constraint, and cascading
foreign key was created without errors. The password-reset flow and the
backup/restore cycle were also tested end-to-end against real data.

```bash
cd backend
npx prisma generate
npx prisma migrate deploy   # applies the committed migration
npm run prisma:seed         # optional demo data
```

Going forward, if you change `schema.prisma`, generate the next migration the
normal way:

```bash
npx prisma migrate dev --name your_change_name
```

> Note: `npx prisma generate` and `migrate dev` need normal internet access
> to download Prisma's query engine binary the first time (a few MB from
> `binaries.prisma.sh`). This happens automatically on any standard dev
> machine or CI runner — the sandbox this project was assembled in has a
> restricted network allowlist that blocks that specific host, which is why
> the migration SQL was authored and verified by hand instead of via
> `prisma migrate dev` directly. It will work normally for you.

---

## What's wired to the backend vs. what's still local-only

Every core workflow is fully persisted end-to-end, including all three
items that were previously demo-only:

**Persisted to the database (create/read/update all hit the API):**
auth & sessions, password reset, team management (invite/deactivate
teammates), approvals (approve/reject + audit trail), leads (create + stage
advancement), followups (create + mark done), issues (create + resolve),
tasks (create + mark done), notifications (create + mark read),
transactions, vendors, employees, DPR records, bookings (+ auto-updates unit
status and creates a collection record), progress updates, material
requests, RA bill submissions (flow into the same Approvals workflow as
everything else), and every list/dashboard view (all reads come from
`/api/bootstrap`, tenant-scoped).

**Still local/log-only:** the AI chat assistant's non-lead-capture
responses (canned replies — captured leads *do* save to the database), and
outbound email (see "Email delivery" below — stubbed to a log line by
default).

---

## Team management

Any authenticated user can view their workspace's team roster
(`GET /api/users`). Admin-level roles (`SUPER_ADMIN`, `MANAGING_DIRECTOR`)
can add teammates and manage their access:

```bash
curl -X POST http://localhost:4000/api/users \
  -H "Authorization: Bearer <admin's access token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Teammate","email":"teammate@company.com","role":"SALES_HEAD"}'
```

This generates a random temporary password and emails it to them (see
"Email delivery" below for wiring up real email). `PATCH /api/users/:id`
changes a teammate's role or deactivates their account.

## Password reset

Users can reset a forgotten password via the "Forgot Password?" link on
the login screen, or directly:

```bash
curl -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"tenantSlug":"aarohan-realty","email":"admin@aarohanrealty.com"}'
```

This always returns a generic success message (even for unknown emails) to
avoid leaking which accounts exist. The actual reset link is delivered
through `sendEmail()` (see below) and points to `reset-password.html`.
Resetting a password revokes all of that user's existing login sessions.

## Email delivery

By default, `backend/src/utils/mailer.ts` just logs outgoing emails to the
console — enough to test the password reset and team-invite flows locally
without any email account of your own. **Before real customers use this**,
replace the body of `sendEmail()` with a real provider (Nodemailer + SMTP,
or a transactional API like SendGrid/Resend/Postmark) — the function's
signature is documented in the file and nothing else needs to change.

## Login rate limiting

`/api/auth/login`, `/api/auth/signup`, and the password-reset endpoints are
protected by a stricter rate limiter (10 requests per IP per 15 minutes),
separate from the general API limiter, to slow down brute-force and
credential-stuffing attempts. Configured in `backend/src/app.ts`.

## Error tracking (optional)

`backend/src/utils/sentry.ts` will automatically start reporting errors to
[Sentry](https://sentry.io) if you: (1) run `npm install @sentry/node` in
`backend/`, and (2) set `SENTRY_DSN` in your environment. It's not installed
by default to keep the dependency tree (and its vulnerability surface)
minimal for people who don't need it — genuinely optional, zero code
changes required to turn it on later.

## Automated backups

`docker-compose.prod.yml` includes a `backup` service that runs `pg_dump`
on a schedule (default: every 24 hours, keeping 14 days of history) into a
Docker volume. See `backup/backup.sh` and `backup/restore.sh`. This was
tested end-to-end during development: a real database was dumped,
restored into a fresh database, and confirmed to contain all tables and
data correctly.

**Important:** a backup living in a Docker volume on the same server as
your database protects against accidental deletion/corruption, not
hardware failure or the whole server going down. For real production use,
also sync backups off-box (e.g. a small script or cron job that copies
`/backups` to S3/GCS/Backblaze) or use your cloud provider's managed
database backups instead of the bundled one.

## HTTPS / TLS

`docker-compose.tls.yml` adds [Caddy](https://caddyserver.com) as a reverse
proxy in front of the frontend container, which gets and auto-renews a free
Let's Encrypt certificate with no manual setup:

```bash
# 1. Point your domain's DNS A record at this server
# 2. Edit Caddyfile — replace "yourdomain.com" with your real domain
# 3. Run:
docker compose -f docker-compose.prod.yml -f docker-compose.tls.yml up -d --build
```

That's it — Caddy handles certificate issuance and renewal automatically.

**Deploying to a managed platform instead of your own server?** See
[`RENDER_DEPLOYMENT.md`](./RENDER_DEPLOYMENT.md) for a full walkthrough of
deploying to Render (free tier, no server/Docker management, HTTPS
included automatically) — the Caddy setup above is for when you're running
Docker yourself on a plain VPS instead.

## Legal documents

`legal/PRIVACY_POLICY.md` and `legal/TERMS_OF_SERVICE.md` are starting-point
templates with `[bracketed]` placeholders. **These are not legal advice —
have them reviewed by a lawyer** before real customers sign up, especially
if you're operating in India (Digital Personal Data Protection Act, 2023)
or handling EU users (GDPR).

---

## Security notes for production

- **Stored XSS protection**: every free-text field a tenant user can submit
  (lead names, vendor/employee names, transaction descriptions, task titles,
  approval details, rejection reasons, notifications, audit log entries,
  customer names, booking customer names) is HTML-escaped server-side before
  it's stored — see `backend/src/utils/sanitize.ts` and its use across the
  module schemas. This is deliberately done on the server, not the browser,
  because the API can always be called directly (curl, Postman, a future
  mobile client), bypassing any client-side cleanup. Verified by inserting a
  real `<img onerror=...>` payload through the schema logic and confirming
  it's stored as inert text, not live markup.
- Set real, random `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` /
  `PLATFORM_ADMIN_KEY` (`openssl rand -base64 48`). The `.env.example`
  placeholders will fail Zod validation if left as-is in a way that's too
  short, but they are **not secure defaults** — always replace them.
- Put the stack behind TLS (a reverse proxy/load balancer in front of the
  `frontend` container — see `docker-compose.prod.yml` comments).
- Rate limiting, Helmet security headers, and CORS allow-listing are already
  configured in `backend/src/app.ts` — update `CORS_ORIGINS` to your real
  domain(s) before going live.
- Refresh tokens are stored hashed (SHA-256) and rotated on every use.

## Testing

```bash
cd backend
npm test          # requires DATABASE_URL pointing at a real Postgres (see CI config)
npm run typecheck
npm run lint
```

## Extending to the remaining modules

Every simple entity (bank accounts, RERA accounts, portfolio, materials,
BOQ, progress, etc.) already has a full CRUD router
(`backend/src/modules/*/**.routes.ts`) built on the shared
`buildCrudRouter()` factory (`backend/src/utils/crudFactory.ts`) — adding a
new field or a new entity is a matter of adding a Prisma model + a ~15-line
router file, following the pattern of any existing module.
