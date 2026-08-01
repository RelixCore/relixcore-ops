# RelixCore Ops

Internal operations system for RelixCore — Admin Dashboard, Lead Tracker (CRM), Daily Checklists, and Team management. Built with Next.js, Prisma, and SQLite.

## Tech stack

- **Next.js 16** (App Router, Server Actions) — run with `--webpack`, not Turbopack (see [Known issues](#known-issues))
- **Prisma + SQLite** — single-file database (`prisma/dev.db`), no external database needed
- **Custom JWT auth** (`jose` + `bcryptjs`) — no third-party auth provider
- **Tailwind CSS v4** for styling

## Local development

```bash
npm install
npx prisma migrate dev   # creates/updates prisma/dev.db
npx prisma db seed       # loads sample users + leads
npm run dev
```

Open http://localhost:3000. Log in with any seeded account (see below).

### Seeded accounts

Every seeded account uses the password **`relixcore2026`** — change this before any real use beyond local testing.

| Email | Role |
|---|---|
| `admin@relixcore.local` | Administrator |
| `growth@relixcore.local` | Growth Lead |
| `upwork@relixcore.local` | Upwork Platform Owner *(+ Junior Editor)* |
| `fiverr@relixcore.local` | Fiverr Platform Owner |
| `linkedin@relixcore.local` | LinkedIn Platform Owner *(+ Senior Editor)* |
| `email@relixcore.local` | Cold Email Platform Owner |
| `senior.editor@relixcore.local` | Senior Editor |
| `junior.editor@relixcore.local` | Junior Editor |
| `webdev@relixcore.local` | Web Developer |
| `designer@relixcore.local` | Senior Graphic Designer |

Administrators and Growth Leads can add, edit, and remove team members from the **Team** page, including assigning secondary roles (e.g. a Platform Owner who also carries editing shifts).

## Deploying on an office LAN (no internet required)

This is the intended setup for in-office use: one machine hosts the app, everyone else connects over a local router. The router doesn't need an internet connection — it only needs to hand out local IP addresses.

1. **On the host machine** (the one that stays on and runs the app):

   ```bash
   npm install
   npx prisma migrate deploy
   npx prisma db seed        # first time only
   npm run build
   ```

2. Add this line to `.env` on the host machine — **required**, see [Known issues](#known-issues):

   ```
   COOKIE_SECURE=false
   ```

3. Start the app:

   ```bash
   npm run start
   ```

4. Find the host machine's LAN IP address:
   - Windows: `ipconfig` → look for "IPv4 Address" on the network connected to the router
   - Mac/Linux: `ifconfig` or `ip addr`

   Next.js also prints it on startup, e.g. `Network: http://192.168.1.108:3000`.

5. **On every other device**: connect to the router's Wi-Fi/network, then open `http://<host-IP>:3000` in a browser (e.g. `http://192.168.1.108:3000`).

### Tips for a smoother office setup

- Give the host machine a **static IP or DHCP reservation** on the router so the URL doesn't change between sessions.
- Write the URL on a sticky note near the router, or generate a QR code for it.
- Keep the host machine plugged in and awake (disable sleep) for the duration of use.
- Windows Firewall may prompt to allow Node.js on first run — allow it on "Private" networks.
- The database is just `prisma/dev.db` on the host machine. Back it up periodically (copy the file) if the data matters.

## Known issues

- **Use `--webpack`, not Turbopack.** This Next.js version has a bug where Turbopack's Node-runtime Proxy (middleware) loader fails at runtime with `adapterFn is not a function`. The `dev` and `build` scripts already pass `--webpack` to avoid this — don't remove that flag.
- **`COOKIE_SECURE`**: the session cookie defaults to `secure: true` (HTTPS-only) when `NODE_ENV=production`, which is what `npm run start` sets. Browsers silently refuse to store secure cookies on a plain `http://` origin (like a LAN IP address), which would otherwise cause an infinite redirect back to `/login`. Set `COOKIE_SECURE=false` in `.env` for any deployment served over plain HTTP (LAN, local testing). Leave it unset for a real HTTPS deployment (e.g. Vercel).

## Moving to cloud hosting later

If this later needs to be reachable outside the office (e.g. remote team members), swap SQLite for a hosted Postgres (Neon or Supabase both have free tiers) and deploy to Vercel's free tier:

1. Change `datasource db { provider = "sqlite" }` to `provider = "postgresql"` in `prisma/schema.prisma`.
2. Point `DATABASE_URL` at the hosted Postgres connection string.
3. Run `npx prisma migrate deploy` against it, then `npx prisma db seed` if starting fresh.
4. Deploy the repo to Vercel; leave `COOKIE_SECURE` unset (Vercel serves over HTTPS by default).
