# Portica Time Tracking System

A Toggl-style time tracking tool for Portica AB's independent contractors. Log hours against
clients/projects on a drag-and-drop calendar, track Swedish public holidays, and export reports.

## Stack

- **Client**: React + TypeScript, Vite, Tailwind CSS, a custom pointer-events calendar (Day/Week/Month
  with drag-move, drag-resize, and click-drag-create), Recharts, React Hook Form, Luxon
  (`Europe/Stockholm`-aware date logic).
- **Server**: Node.js + Express, Prisma ORM, PostgreSQL. Structured to run as a single Vercel
  serverless function (`api/index.ts` wraps the Express app; `vercel.json` rewrites all requests to it).
- **Auth**: JWT, role-based (`ADMIN` vs `CONTRACTOR`).
- **Database**: PostgreSQL, intended for Neon via Vercel's Storage integration (`DATABASE_URL` pooled +
  `DIRECT_URL` direct, both wired into `prisma/schema.prisma`).

## Repository layout

```
client/   React app (Vite)
server/   Express API + Prisma schema, deployable as a Vercel serverless function
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

## Deploying to Vercel

Deploy `client` and `server` as **two separate Vercel projects**, same pattern as the TIPI project.

### Database (Neon via Vercel Storage)

1. Add the Neon Postgres integration to your Vercel team/project.
2. Copy the pooled connection string into `DATABASE_URL` and the direct (non-pooled) connection string
   into `DIRECT_URL` for the server project's environment variables.
3. Run `npx prisma migrate deploy` (e.g. via a one-off `vercel exec` or locally against the prod DB) to
   apply migrations, then run the seed script once if you want the initial admin user.

### Server project (root directory: `server/`)

Environment variables: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN` (the
client's deployed URL).

`server/vercel.json` builds via `npm run build` (runs `prisma generate` + `tsc`) and rewrites all
requests to the `api/index.ts` serverless function, which wraps the Express app from `src/app.ts`.

### Client project (root directory: `client/`)

Build command `npm run build` (Vite). Set an environment-appropriate API base URL if not proxying
through the same domain — currently the client calls relative `/api/...` paths, so put it behind the
same domain as the server (e.g. via a Vercel rewrite) or update `client/src/lib/api.ts`'s `baseURL` to
point at the deployed server URL.

## Out of scope

Per the product spec: no attendance/late/undertime rules, no leave requests or balances, no approval
workflow or edit history on time entries (edits overwrite in place), no QR/biometric check-in, payroll
integration, or multi-company support.
