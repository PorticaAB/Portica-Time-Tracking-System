# Portica Time Tracking System

A Toggl-style time tracking tool for Portica AB's independent contractors. Log hours against
clients/projects on a drag-and-drop calendar, track Swedish public holidays, and export reports.

## Stack

- **Client**: React + TypeScript, Vite, Tailwind CSS, a custom pointer-events calendar (Day/Week/Month
  with drag-move, drag-resize, and click-drag-create), Recharts, React Hook Form, Luxon
  (`Europe/Stockholm`-aware date logic).
- **Server**: Node.js + Express, Prisma ORM, PostgreSQL. Deployed as a normal long-running process on
  Railway (`railway.json`); the Express app (`src/app.ts`) is also wrapped for Vercel serverless
  (`api/index.ts` + `vercel.json`) as an alternative if you'd rather host it there instead.
- **Auth**: JWT, role-based (`ADMIN` vs `CONTRACTOR`).
- **Database**: PostgreSQL via Neon (`DATABASE_URL` pooled + `DIRECT_URL` direct, both wired into
  `prisma/schema.prisma`).

## Repository layout

```
client/   React app (Vite), deployed to Vercel
server/   Express API + Prisma schema, deployed to Railway
```

## Local development

Requires Node 20+ and a PostgreSQL database.

```bash
npm install                      # installs both workspaces

cp server/.env.example server/.env
# edit server/.env: set DATABASE_URL / DIRECT_URL to your local Postgres, and JWT_SECRET

cd server
npx prisma migrate dev           # creates the schema
npm run seed                     # creates an admin + a sample contractor/client/project

cd ..
npm run dev:server               # http://localhost:4000
npm run dev:client               # http://localhost:5173 (proxies /api to :4000)
```

Seeded accounts (see `server/prisma/seed.ts`):

- Admin: `catarina@portica.se` / `Admin123!`
- Contractor: `anna@portica.se` / `Contractor123!`

## Timezone handling

All calendar-day and display logic uses `Europe/Stockholm` via Luxon (`client/src/lib/time.ts`), which
correctly handles the CET/CEST daylight-saving transitions. Timestamps are stored as UTC instants in
Postgres (`TimeEntry.startTime` / `endTime`); only the client's calendar-boundary math is timezone-aware.

## Swedish public holidays

`server/src/lib/swedishHolidays.ts` computes Sweden's public holidays for any year (fixed dates plus the
Easter-derived ones, and the nearest-weekend rule for Midsummer and All Saints' Day). Admins can:

- Manually add/edit/remove holidays (`/admin/holidays`).
- Click "Sync `<year>`" to upsert the computed set for that year.

## Deploying

Database is always **Neon** Postgres. For hosting the app, pick one:

### Option A: Vercel + Vercel (simplest — one platform, no Railway account)

- **Database**: Neon Postgres. Grab both the pooled connection string (`DATABASE_URL`, hostname ends in
  `-pooler`) and the direct one (`DIRECT_URL`) from the Neon dashboard.
- **Server → Vercel project #1** (root directory: `server/`). `server/vercel.json` builds via
  `npm run build && npx prisma migrate deploy` — migrations apply automatically on every build, since
  serverless has no persistent process to hook a start-time migration into — then rewrites all requests
  to the `api/index.ts` function, which wraps the Express app from `src/app.ts`. Env vars: `DATABASE_URL`,
  `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN` (the client's Vercel URL).
- **Client → Vercel project #2** (root directory: `client/`). Standard Vite build; `client/vercel.json`
  rewrites all paths to `index.html` for client-side routing. Set `VITE_API_URL` to the server project's
  URL + `/api` (e.g. `https://portica-server.vercel.app/api`).

### Option B: Railway (server) + Vercel (client)

- **Server → Railway** (root directory: `server/`). `server/railway.json` sets the build command to
  `npm run build` and the start command to `npm run start`, which runs `prisma migrate deploy` before
  booting the server. Same env vars as above; `PORT` is set automatically by Railway.
- **Client → Vercel**, same as Option A, pointing `VITE_API_URL` at the Railway URL instead.

Both options use the exact same client and Prisma schema — the only difference is which config file
(`server/vercel.json` vs `server/railway.json`) ends up driving the server build.

## Manual setup checklist (first-time deploy, Option A)

1. **Neon**: create an account/project at neon.tech, create a database, copy the pooled and direct
   connection strings.
2. **Vercel — server**: create an account, New Project → import the GitHub repo, set root directory to
   `server`, add env vars `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (e.g. `openssl rand -base64 48`),
   `JWT_EXPIRES_IN=7d`, and a placeholder `CORS_ORIGIN` for now. Deploy, then copy the resulting URL.
3. **Vercel — client**: New Project again on the same repo, root directory `client`, env var
   `VITE_API_URL` = `<server URL>/api`. Deploy, then copy the resulting URL.
4. Go back to the server project's env vars, set `CORS_ORIGIN` to the real client URL from step 3, and
   redeploy (Vercel → Deployments → ⋯ → Redeploy) so the new env var takes effect.
5. Run the seed script once (locally, pointed at the production `DATABASE_URL`/`DIRECT_URL`) if you want
   the initial admin account, or create the first admin directly via `prisma studio` / SQL.

(For Option B, swap step 2 for the Railway steps in the previous version of this section — same env
vars, just set in Railway's dashboard instead, with root directory `server` there too.)

## Out of scope

Per the product spec: no attendance/late/undertime rules, no leave requests or balances, no approval
workflow or edit history on time entries (edits overwrite in place), no QR/biometric check-in, payroll
integration, or multi-company support.
