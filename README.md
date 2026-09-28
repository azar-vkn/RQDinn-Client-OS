# RQDINN — Client OS

**Build. Manage. Deliver.**

RQdinn Client OS is the internal operating system for the RQdinn agency. It runs the full client lifecycle:

> Lead → Client → Agreement → Payment → Onboarding → Development → Review → Approval → Final Payment → Launch → Maintenance

It has two experiences:

- **Admin portal** (`/dashboard` …) for the RQdinn team: clients, projects, workflows, live onboarding calls, agreements, invoices, payments, tasks, revisions, deployment, maintenance, analytics.
- **Client portal** (`/portal` …) for each client: a simple, mobile-first workspace to follow progress, upload files, review previews, approve, see invoices, accept the agreement and request updates.

---

## Quick start

Requirements: **Node.js 20.9+** (tested on Node 24).

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000.

With no `DATABASE_URL`, the app uses an **embedded PostgreSQL (PGlite)** stored in `./.data/pglite`. On first start it runs the migrations and seeds demo data automatically, so there is nothing else to install.

### Demo accounts

All demo accounts share the password `RQdinn@2026`. They are also one-click buttons on the login screen while `DEMO_MODE=true`.

| Role | Email | Sees |
|---|---|---|
| Admin | `admin@rqdinn.demo` | Everything |
| Team member | `aisha@rqdinn.demo` | Only projects assigned to her |
| Team member | `rohan@rqdinn.demo` | Only projects assigned to him |
| Client (D'PARKZ) | `owner@dparkz.demo` | D'PARKZ portal |
| Client (Nova Dental) | `sneha@novadental.demo` | Nova portal (preview in review) |
| Client (GreenLeaf) | `arjun@greenleaf.demo` | GreenLeaf portal (live, maintenance) |

All seeded records are marked **Demo** in the UI and use `*.demo` emails.

| Client | State |
|---|---|
| **D'PARKZ** | Official Website · ₹30,000 + ₹6,000 annual · ₹15,000 advance paid · onboarding done · **In Development** |
| Spice Route Kitchen | QR ordering · onboarding call scheduled for tomorrow |
| Nova Dental Studio | Website · V2 in client review after one revision round |
| GreenLeaf Organics | Website · **Live**, in maintenance, one open update request |
| Kaapi House Café | New lead · draft agreement |

### Resetting demo data

- In the app: **Settings → Integrations → Demo data** (admin only).
  - **Reset demo data** restores everything.
  - **Reset — start D'PARKZ from scratch** seeds everything except D'PARKZ, so you can create it live.
- From the CLI (stop `npm run dev` first, because PGlite allows one process at a time):

```bash
npm run db:reset
npm run db:reset:fresh-dparkz
```

---

## The D'PARKZ demo (start to finish)

Reset with **"start D'PARKZ from scratch"**, sign in as Admin, then:

| # | Step | Where |
|---|---|---|
| 1 | Create the D'PARKZ client (industry: Restaurant) | Clients → **New client** |
| 2–3 | Create the website project and pick the **Website Project** workflow | Client → **New project** |
| 4 | Generate the agreement, then **Send to client** | Project → Documents → **Generate agreement** |
| 5 | Generate the invoice (₹30,000 + ₹6,000 = ₹36,000), then **Mark as sent** | Project → Payments → **Generate invoice** |
| 6 | Record the ₹15,000 advance. The project moves to *Onboarding* | Payments → Advance → **Record** |
| 7–10 | Open **Call Mode**, fill answers live, upload logo/menu, mark photos "Client will send later", **COMPLETE ONBOARDING** | Next step → **Start onboarding call** |
| 11 | **Content received — start development** | Project overview |
| 12–13 | Upload the V1 preview URL and send it | Project → Review → **Upload preview** |
| — | Create client access | Client → **Invite to portal** (shows a one-time password) |
| 14 | As the client: **Request Changes**, with screenshots | Portal → Review |
| 15 | Respond and mark the round **Completed**, then upload and send V2 | Project → Review |
| 16 | As the client: **Approve** and confirm. The project moves to *Final Payment* | Portal → Review |
| 17 | Record the final payment. The "Final payment" checklist item ticks itself | Project → Payments |
| 18 | Tick the checklist until it shows **READY TO LAUNCH** | Project → Deployment |
| 19 | **Mark website LIVE** (🎉 launch record) | Deployment |
| 20 | **Move to maintenance** | Deployment / Overview |
| 21 | As the client: **Request an update** | Portal → Updates |

Every step updates the project timeline (Activity), the dashboard pipeline, notifications and the client portal.

---

## Architecture

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions), TypeScript |
| UI | Tailwind CSS v4, shadcn-style components on Radix primitives, lucide icons, sonner toasts, cmdk palette |
| Database | PostgreSQL via Drizzle ORM. Supabase/any Postgres in production; embedded PGlite locally |
| Auth | Database sessions (hashed token, httpOnly cookie), bcrypt passwords, role-based access |
| Files | Storage driver interface: local disk or a private Supabase Storage bucket |
| PDFs | Server-side with `pdf-lib` (invoices, agreements, receipts) |

```
src/
  app/
    (admin)/          dashboard, clients, projects, tasks, payments, documents,
                      onboarding, workflows, maintenance, analytics, settings,
                      invoices, agreements
    (focus)/call/     Onboarding Call Mode (full-screen, no navigation)
    portal/           Client portal
    api/              uploads, files/[id], pdf/[kind]/[id], search
    login/
  server/
    db/               schema.ts, client.ts (dual driver), seed.ts, cli.ts, workflow-templates.ts
    auth/             session.ts, password.ts, permissions.ts
    services/         business logic (no UI): clients, projects, workflow-engine, onboarding,
                      billing, agreements, tasks, delivery, maintenance, documents, files,
                      activity, notifications, dashboard, portal, settings, workflows
    actions/          server actions: auth + zod validation, then call services
    integrations/     notifications/channels, payments, esign, storage
    pdf/              PDF rendering
  components/         ui/ (primitives), shared/, shell/, feature folders
  lib/                constants, onboarding definition, formatting, validators
drizzle/              SQL migrations (incl. RLS hardening)
```

### Workflow engine

Workflows are reusable lists of steps. Admins edit them in **Workflows**. Each step has:

- a **semantic key** (`agreement`, `advance_payment`, `onboarding`, `content_collection`, `development`, `client_review`, `final_payment`, `domain_hosting`, `deployment`, `maintenance`, or `custom`);
- a **pipeline column** (the dashboard stage).

When a project is created, its workflow's steps are copied into `project_steps`. Business events call `handleEvent(projectId, event)`, and the engine moves steps forward by key:

| Event | Effect |
|---|---|
| Advance payment recorded | completes `advance_payment` |
| Onboarding completed | completes `onboarding` (and `content_collection` if nothing is outstanding) |
| Preview sent | completes `development`, starts `client_review` |
| Client approval | completes review and approval |
| Final payment recorded | completes `final_payment`, ticks the deployment item |
| DNS/SSL checklist items done | completes `domain_hosting` |
| Launch | completes `deployment` |

Any workflow (website, QR ordering, CRM) advances automatically, and custom steps are moved manually from the stage tracker.

Each stage has a status, dates, an owner, notes and its own tasks. Add a task to a stage from the stage tracker, or pick a stage in the task form. Onboarding follow-ups land in Content Collection automatically.

### Onboarding

The form is declarative (`src/lib/onboarding.ts`): 8 sections, conversational "call mode" wording for each question, and industry-specific fields (restaurant fields appear only for food businesses).

- Every answer autosaves on its own to `onboarding_answers`, with debouncing and per-field "Saved" indicators.
- Files attach to the question they answer.
- Completing onboarding:
  - fills blank client fields (address, Google Business, Instagram);
  - creates follow-up tasks for assets the client will send later;
  - advances the workflow.

### Data model

`users`, `sessions`, `clients`, `client_contacts`, `workflows`, `workflow_steps`, `projects`, `project_steps`, `onboarding_forms`, `onboarding_answers`, `files`, `documents`, `agreement_templates`, `agreements`, `invoices`, `invoice_items`, `payment_milestones`, `payments`, `tasks`, `previews`, `revisions`, `approvals`, `deployment_items`, `launches`, `maintenance_requests`, `notifications`, `activity_logs`, `settings`.

- Money is stored as integers in paise.
- Agreements, invoices and receipts are never copied into `documents`. The Documents views merge them at query time.

### Security

- Every page, server action and route handler authenticates on the server (`src/server/auth`). `proxy.ts` is only an early redirect.
- Roles:
  - **admin**: everything.
  - **team**: projects they lead, host onboarding for, own the client of, or have tasks on.
  - **client**: only their own company. Draft invoices and agreements are hidden.
- Files are never public. Downloads go through `/api/files/[id]` with an access check, safe `Content-Disposition` and a sandbox CSP.
- Uploads are checked for type, size and count, filenames are sanitised, and storage keys are random.
- All input is validated with zod on the server. Forms keep their values when a submission fails.
- The login is throttled; session tokens are stored only as SHA-256 hashes.
- Secrets live only in environment variables (see `.env.example`). Nothing sensitive is sent to the browser.
- Migration `0001_enable_rls.sql` turns on Row Level Security for every table, so Supabase's public API exposes nothing.

### Integration points (not live in the MVP)

| Area | Where | Status |
|---|---|---|
| Notifications | `integrations/notifications/channels.ts` | In-app live. Email (Resend), WhatsApp and SMS channels are stubs. Events → channels are mapped in `services/notifications.ts` |
| Payments | `integrations/payments.ts` | Razorpay provider interface. Today payments are recorded manually when money arrives, with no fake confirmations. A webhook would call `billing.recordPayment({ provider: "razorpay" })` |
| E-signature | `integrations/esign.ts` | Agreements store `signature_provider` and `signature_envelope_id`. Today clients give a recorded click-through acceptance (name, time, IP), clearly labelled as not a digital signature |
| Calendar | `projects.calendar_event_id` | Onboarding scheduling is manual and ready for Google Calendar sync |
| Storage | `integrations/storage.ts` | `local` or `supabase`. S3 or Google Drive can implement the same interface |

---

## Going live with real data

`setup:admin` prepares a database for real use in one go:
- deletes **all** data, including demo data;
- installs the standard workflows, the agreement template and agency settings;
- creates your admin account.

```bash
npm run setup:admin -- --name "Your Name" --email you@yourdomain.com --yes
```

- Without `--yes` it only tells you which database it would wipe.
- It prints a strong generated password once. Save it, then change it under **Settings → Profile** if you like. To choose your own password instead, set `ADMIN_PASSWORD` (12+ characters) before running it.
- Then sign in and fill in **Settings → Agency** (bank details, phone, GSTIN, invoice prefix), and add your team under **Settings → Team**.
- With `DEMO_MODE=false`, `db:seed` and `db:reset` refuse to load demo data (use `--force` to override), so production can't be overwritten by accident.

## Deploying to production (Vercel + Supabase)

1. **Create a Supabase project.**
   - Copy the **connection pooling** URI (Transaction mode, port 6543).
   - Create a **private** Storage bucket, e.g. `client-files`.
2. **Run the migrations** from your machine:
   ```bash
   DATABASE_URL="postgres://…:6543/postgres" npm run db:migrate
   ```
   (Optional) Seed demo data with `DATABASE_URL=… DEMO_MODE=true npm run db:seed`.
3. **Set the environment variables on Vercel:**

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the pooled URI |
   | `STORAGE_DRIVER` | `supabase` |
   | `SUPABASE_URL` | your project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | server-only, never exposed to the browser |
   | `SUPABASE_STORAGE_BUCKET` | `client-files` |
   | `DEMO_MODE` | `false` |
   | `APP_URL` | `https://your-domain` |

4. In Vercel → Project Settings → Functions, set the **Function Region to Mumbai (`bom1`)**, the same region as the Supabase project (ap-south-1). Server-to-database queries then take a few milliseconds.
5. Deploy. No separate cloud functions are needed: server actions and API routes run as Vercel functions.
6. Sign in with a seeded admin, or insert your first admin. Then change the password under **Settings → Profile** and add the team under **Settings → Team**.

> Local disk storage and PGlite are for development and single-server hosting only. Use `DATABASE_URL` and the Supabase storage driver on serverless platforms.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server (auto-migrates and seeds the embedded DB) |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Generate a migration after editing `schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo data if the DB is empty |
| `npm run db:reset` | Wipe and re-seed demo data |
| `npm run db:reset:fresh-dparkz` | Wipe and re-seed without D'PARKZ |
