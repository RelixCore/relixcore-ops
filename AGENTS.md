<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# RelixCore Ops

## 1. Project Overview

RelixCore Ops is the internal operations system for RelixCore, a video editing / content production agency. It replaces what would otherwise be a spreadsheet-based workflow (lead tracking, daily role checklists, team roster) with a single web app.

It has four modules:

- **Admin Dashboard** — live KPIs computed from the CRM (leads, win rate, pipeline value, MRR) plus a rollup of everyone's daily checklist completion.
- **Lead Tracker (CRM)** — the sales pipeline: leads move through stages from first contact to won/lost, retainer, and referral.
- **Daily Checklist** — a role-specific task list (arrival tasks, delivery work, channel-specific lead-gen SOPs, end-of-day) that resets each calendar day.
- **Team** — the staff directory, plus add/edit/remove for admins.

**User roles** (`Role` enum in `prisma/schema.prisma`): `ADMIN`, `GROWTH_LEAD`, `UPWORK_OWNER`, `FIVERR_OWNER`, `LINKEDIN_OWNER`, `COLD_EMAIL_OWNER`, `SENIOR_EDITOR`, `JUNIOR_EDITOR`, `WEB_DEVELOPER`, `GRAPHIC_DESIGNER`.

A user has one **primary role** plus any number of **secondary roles** (`UserRole` join table) — e.g. a Platform Owner who also covers editing shifts. Permissions and checklists are the union of all of a user's roles (see `effectiveRoles()` in `src/lib/roles.ts`).

Role-based access, enforced in `src/lib/roles.ts`:
- `DASHBOARD_ROLES` (`ADMIN`, `GROWTH_LEAD`) — see the Admin Dashboard.
- `CRM_EDIT_ROLES` (those two plus the four platform-owner roles) — can create/edit/delete leads; everyone else has read-only CRM access.
- `TEAM_MANAGE_ROLES` (`ADMIN`, `GROWTH_LEAD`) — can add/edit/remove team members.
- Every authenticated user gets their own Daily Checklist and read access to the Lead Tracker and Team directory.

## 2. Tech Stack

- **Frontend**: Next.js 16 (App Router, React 19 Server Components + Server Actions), Tailwind CSS v4, TypeScript. No separate client-side data-fetching library (no SWR/React Query) — pages are server-rendered and mutations go through Server Actions.
- **Backend**: there is no separate backend service. "Backend" logic is Next.js Server Actions and Server Components running in the same app, querying the database directly via Prisma.
- **Database**: PostgreSQL via Prisma ORM 6.19.3, hosted on Prisma Postgres (`db.prisma.io`) for the deployed environment. The schema also supports SQLite for a fully offline office-LAN deployment mode (see `README.md` — swap `provider` in `prisma/schema.prisma` and re-run migrations; the original SQLite migration history is preserved in `prisma/migrations.sqlite.bak/`).
- **Authentication**: custom, not a third-party provider. Passwords hashed with `bcryptjs`; sessions are a JWT (`jose`) stored in an `httpOnly` cookie (`relixcore_session`), verified in `src/lib/auth.ts`. No OAuth/SSO.
- **Third-party services**:
  - **Prisma Postgres** — the hosted database for the deployed instance.
  - **Vercel** — hosting. Deployed via direct file upload (no git remote connected to the project), so a deploy means re-uploading the full source tree, not a `git push`.
- **Notable environment quirk**: this Next.js build has a Turbopack bug where the Node-runtime Proxy (`src/proxy.ts`, Next 16's renamed middleware) throws `adapterFn is not a function` at runtime. Both `dev` and `build` npm scripts pass `--webpack` to avoid it — don't remove that flag.

## 3. Project Structure

```
prisma/
  schema.prisma            Data model (User, UserRole, Lead, ChecklistEntry) + enums
  seed.ts                  Seeds 10 sample users (all password "relixcore2026") + 12 sample leads
  migrations/               Postgres migration history (current, live)
  migrations.sqlite.bak/    Old SQLite migration history, kept for reverting to LAN/offline mode

public/images/              logo.png + headshot photos (headshots are LAN-mode only, excluded from
                             the cloud deploy for payload-size reasons; cloud users fall back to
                             initials avatars)

src/
  proxy.ts                  Next 16 "Proxy" (renamed middleware). Cookie-presence gate only —
                             redirects unauthenticated requests to /login. Does NOT verify the JWT
                             or check roles; that happens per-request in Server Components/Actions.

  lib/
    auth.ts                 Session lifecycle: createSession/destroySession/getCurrentUser,
                             password hashing/verification. getCurrentUser() is the source of truth
                             for "who is logged in" everywhere in the app.
    prisma.ts                Singleton PrismaClient (dev-mode HMR-safe pattern).
    roles.ts                 Role labels, permission predicates (canEditCrm, canViewDashboard,
                             canManageTeam), effectiveRoles(), combinedRoleLabel().
    checklists.ts             Hardcoded per-role checklist templates (blocks of timed tasks) and
                             checklistItemKey() (role-scoped key so multi-role users don't collide).
    checklistProgress.ts     getTeamChecklistProgress() — used by both the Dashboard's team-wide
                             rollup and the Checklist page's "Team Progress Today" widget.
    date.ts                  todayKey() — local-calendar-day string, used to key checklist rows.

  components/                Shared UI. Notably LeadForm.tsx and UserForm.tsx (create/edit forms
                             with useActionState), ConfirmButton.tsx (client-side confirm() gate
                             for destructive actions), Sidebar.tsx (nav + role label + logout).

  app/
    layout.tsx, globals.css   Root layout, Tailwind theme tokens (brand colors as CSS variables).
    page.tsx                  "/" — redirects to /dashboard or /checklist depending on role.
    actions.ts                 logoutAction (top-level, not route-scoped).
    login/                     Public route: page.tsx, LoginForm.tsx (client), actions.ts
                               (loginAction).

    (app)/                    Route group for everything behind auth. layout.tsx here renders the
                               Sidebar and redirects to /login if there's no session.
      dashboard/page.tsx        Admin/Growth Lead only. KPI cards + leads-by-channel table +
                               team checklist completion.
      leads/                    Lead Tracker (CRM).
        page.tsx                 List + filters (stage/channel/vertical/search).
        new/page.tsx, [id]/page.tsx   Create / edit (or read-only detail if the viewer lacks
                               canEditCrm).
        actions.ts                createLeadAction, updateLeadAction, deleteLeadAction (Zod-
                               validated Server Actions).
      checklist/                 page.tsx renders one ChecklistBlocks section per role the user
                               holds; actions.ts has toggleChecklistItemAction.
      team/                      Directory (page.tsx), new/page.tsx (create), [id]/page.tsx
                               (profile — read-only unless canManageTeam), actions.ts
                               (createUserAction, updateUserAction, deleteUserAction).
```

Route-colocated `actions.ts` files are the convention for mutations — each feature area (`leads/`, `team/`, `checklist/`) owns its Server Actions rather than a shared `api/` layer.

## 4. Application Flow

There is no REST/GraphQL API layer — requests go straight from the browser to Server Components (reads) or Server Actions (writes), both of which call Prisma directly.

**Read path (page load):**
1. Request hits `src/proxy.ts`. If there's no `relixcore_session` cookie and the path isn't `/login`, redirect to `/login`. This is a cheap presence check only — no JWT verification happens here.
2. The route's `layout.tsx`/`page.tsx` (a Server Component) calls `getCurrentUser()` (`src/lib/auth.ts`), which reads the cookie, verifies the JWT with `jose`, and loads the `User` row (with `secondaryRoles`) from Postgres via Prisma. This is the real auth check — every protected page re-verifies here, not just at the proxy layer.
3. The page computes `effectiveRoles()` and gates content with the `roles.ts` predicates (e.g. `dashboard/page.tsx` redirects non-admins to `/checklist`).
4. The page queries whatever data it needs directly via Prisma (`prisma.lead.findMany(...)`, etc.) and renders server-side. No client-side fetching.

**Write path (mutation):**
1. A form in a Client Component (e.g. `LeadForm.tsx`) is bound to a Server Action via `useActionState`, or a plain `<form action={...}>` for fire-and-forget actions like delete.
2. The Server Action (in the route's `actions.ts`) re-checks auth and role permission itself (e.g. `requireCrmEditor()` in `leads/actions.ts`) — it does not trust that the UI already hid the button from unauthorized users.
3. Input is validated with a Zod schema. Note: HTML `<select>` placeholders submit `""`, not absent — optional enum fields use `z.preprocess` to treat `""` as `undefined` (see `leadSchema.segment` for the pattern).
4. On success: Prisma write, `revalidatePath()` on affected routes, then `redirect()`. On validation failure: return an error string, which `useActionState` surfaces inline in the form.

**Session lifecycle:** login (`login/actions.ts`) verifies credentials with `bcryptjs`, then `createSession()` signs a JWT and sets it as an `httpOnly` cookie. The cookie's `secure` flag is conditional (`COOKIE_SECURE` env var, falling back to `NODE_ENV === "production"`) specifically to support the office-LAN deployment mode, which serves over plain HTTP.

## 5. Core Features

**Completed / in production:**
- Authentication (login/logout, JWT session, bcrypt password storage).
- Admin Dashboard — KPI cards (total/won/lost leads, close rate, pipeline value, avg deal size, est. MRR), leads-by-channel table, team-wide checklist completion rollup.
- Lead Tracker (CRM) — list with search + stage/channel/vertical filters, create, edit, delete, read-only fallback view for non-editor roles.
- Daily Checklist — per-role templates, multi-role support (a user with secondary roles sees one section per role), per-day per-user completion state, "Team Progress Today" widget for managers.
- Team management — directory with avatar/initials fallback, secondary-role badges, add/edit/remove (Admin/Growth Lead only), per-member profile page (read-only for everyone else), safeguards against deleting your own account or the last remaining Administrator.

**Not yet built / known gaps:**
- No real file upload for avatars — `avatarUrl` is a plain text field (a path or URL); there's no upload UI or storage integration. LAN mode points it at local files in `public/images/`; the cloud deploy currently has none set (falls back to initials avatars everywhere).
- No git-based CI/CD — the live Vercel deployment was pushed via direct file upload, not a connected GitHub repo. Future changes require re-uploading the full source tree; there's no `git push`-to-deploy pipeline set up yet.
- No automated tests (unit or e2e) — verification so far has been manual (typecheck, build, and browser click-through).
- No password reset / "forgot password" flow — an Admin/Growth Lead resets a user's password manually via the Team edit form.
- No audit log of who changed what on a lead or team member.
