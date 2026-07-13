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

## Deploying (Neon + Railway + Vercel)

- **Database**: Neon Postgres. Grab both the pooled connection string (`DATABASE_URL`, hostname ends in
  `-pooler`) and the direct one (`DIRECT_URL`) from the Neon dashboard.
- **Server → Railway** (root directory: `server/`). `server/railway.json` sets the build command to
  `npm run build` (`prisma generate` + `tsc`) and the start command to `npm run start`, which runs
  `prisma migrate deploy` before booting the server — so the schema is applied automatically on every
  deploy, no manual migration step. Required env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`,
  `JWT_EXPIRES_IN`, `CORS_ORIGIN` (the deployed client URL). `PORT` is set automatically by Railway.
- **Client → Vercel** (root directory: `client/`). Standard Vite build (`npm run build`, output `dist/`);
  `client/vercel.json` rewrites all paths to `index.html` for client-side routing. Set `VITE_API_URL` to
  the deployed Railway backend URL + `/api` (e.g. `https://<service>.up.railway.app/api`) — see
  `client/.env.example`.

See the full manual setup checklist below for the exact dashboard steps.

## Manual setup checklist (first-time deploy)

1. **Neon**: create an account/project at neon.tech, create a database, copy the pooled and direct
   connection strings.
2. **Railway**: create an account, connect the GitHub repo, add a service with root directory `server`,
   set the env vars listed above, deploy.
3. **Vercel**: create an account, connect the GitHub repo, add a project with root directory `client`,
   set `VITE_API_URL` to the Railway URL, deploy.
4. Update the Railway service's `CORS_ORIGIN` to the real Vercel URL once you have it, and redeploy.
5. Run the seed script once (locally, pointed at the production `DATABASE_URL`/`DIRECT_URL`) if you want
   the initial admin account, or create the first admin directly via `prisma studio` / SQL.

## Out of scope

Per the product spec: no attendance/late/undertime rules, no leave requests or balances, no approval
workflow or edit history on time entries (edits overwrite in place), no QR/biometric check-in, payroll
integration, or multi-company support.
