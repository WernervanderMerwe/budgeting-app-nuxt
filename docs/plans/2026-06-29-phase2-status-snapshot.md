# Phase 2 Status Snapshot — 2026-06-29

Resume point for the Supabase→VPS / better-auth migration.
Full plan: `docs/plans/2026-06-26-migrate-off-supabase-modernize-stack.md`.
Key deviations from that plan are in memory `budgeting-phase2-decisions`.

**Branch:** `migrate/vps-postgres-modern-stack` (off `master`). **Nothing pushed** — push is the user's manual step after review.

---

## TL;DR

- **Phase 1 (stack modernization): DONE** (Nuxt 4 / Nuxt UI v4 / Tailwind v4 / Prisma 7).
- **Phase 2 local (drop Supabase → better-auth magic-link + local Postgres): DONE & verified**, except the final human click-test (2d) and the VPS infra (2e).
- Build green, typecheck 0 errors, code-reviewed, browser-smoke verified, Resend email domain **verified and live**.

---

## What's done (committed on the branch)

Phase 2 commits (newest first):
```
206f08f fix(auth): whitelist /api/_nuxt_icon so icons load on public pages
8754193 fix(auth): address code review findings
f08cc4c feat(auth): swap Supabase auth for better-auth magic-link; remove Supabase
3460028 feat(auth): better-auth magic-link server config + Resend mailer
a86cb2d feat(db): baseline reset migrations + add better-auth tables
63f283c chore(db): add local dev Postgres compose + better-auth/resend deps
```

- **DB:** baseline-reset the stale migration history (it described an obsolete `users`/`user_id` design) into one fresh `init` that matches the real `Profile`/`profile_token` schema **and** adds better-auth tables (`user`/`session`/`account`/`verification`, all `@@schema("budgeting")`). `Profile.authUserId` changed uuid→text. Dropped now-GA `multiSchema`/`driverAdapters` preview flags.
- **Server auth:** `server/lib/auth.ts` builds better-auth **per-request** (`serverAuth(event)`) via `getPrisma(event)` — required for Cloudflare edge (Hyperdrive binding only exists in handlers). `server/utils/mailer.ts` sends magic links via Resend HTTP API. Handler at `server/api/auth/[...all].ts`.
- **Server middleware** (`server/middleware/auth.ts`): resolves the better-auth session, **auto-creates a `Profile` on first sign-in** (P2002-race tolerant), preserves the `event.context.profileToken` contract so the ~47 downstream endpoints are untouched.
- **Client:** `app/plugins/auth-client.client.ts` (client-only), `useAuth` rewritten to magic-link (`sendMagicLink`/`fetchSession`/`signOut`), global guard `app/middleware/auth.global.ts`. Pages: magic-link `login.vue` + `confirm.vue`; deleted `signup.vue`/`reset-password.vue`.
- **Supabase fully removed:** deps, `@nuxtjs/supabase` module, the `supabase{}` config block, and the `@supabase/supabase-js` type import. `@react-email/render` mocked in `nuxt.config.ts` for edge bundling.
- **Code review** (superpowers:code-reviewer) done; all real findings fixed (H1 race, H2/H3 secret+baseURL+trustedOrigins, M1 confirm wiring, M2 error leak, L1 route boundaries, L5 dead route, M4 `.env.example`). Verified non-issues: M3 (better-auth sets `name:""`), L2/L3 (by design), L4 (deferred — tiny single-user tables).
- **Browser smoke verified:** unauth→/login redirect, login renders (magic-link only, no password/signup), /guide public, **no console errors, no hydration mismatch** after the icon fix.
- **Email:** Resend domain `send.wernerbuildsapps.co.za` (id `66f3b035-c21f-407b-9330-253b5f34d9c7`, eu-west-1) **VERIFIED** (DKIM+SPF). DNS records added to Cloudflare (zone `3c1ad23b25b17f15d0c22ef37c100975`). Verified the send pipeline: POST `/api/auth/sign-in/magic-link` → `{status:true}`, a `verification` row was created, no errors.

## Untracked / out-of-git state (be aware)
- `.env.local` (gitignored) was updated: `DATABASE_URL`/`DIRECT_URL` → local Docker (`localhost:5434`); Supabase values preserved as comments; added `RESEND_FROM`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. Supabase `SUPABASE_URL`/`SUPABASE_KEY` still present but unused.
- `docker-compose.yml` is now tracked (local dev Postgres). NOTE: the original untracked `docker-compose.yml` from session start was overwritten by an earlier agent and is unrecoverable; current content is a clean dev-Postgres service.
- `package-lock.json` is intentionally gitignored (repo convention).

---

## What's left

### 2d — Final local click-test — ✅ DONE (2026-07-01)
Verified autonomously via the DB verification token + Playwright (no email click needed):
- Magic link → `{status:true}`, token verified, redirect to `/confirm` → app.
- `user` row created (`emailVerified=t`), 90-day `session`, and **`Profile` auto-created** (`profiles` table: fresh `profile_token`, unix `created_at`) — the middleware's first-sign-in provisioning works.
- App root shows signed-in view ("W" avatar, no `/login` redirect); `/transaction` and `/yearly/2026` render authenticated DB-backed empty states.
- **Bonus fix (commit `89e6602`):** signed-in pages threw a Vue hydration mismatch (client-only auth state → SSR rendered logged-out shell, client hydrated to authenticated widget). Wrapped `UserWidget` in `<ClientOnly>` with a placeholder fallback. Re-verified: mismatch gone, console clean.

Nothing pushed — still the user's call after review.

### 2e — VPS infra + cutover (needs user + SSH; separate sit-down)
Open decisions/steps from the main plan (Tasks 2.0, 2.9, 2.11; 2.10 data-migration is DROPPED — fresh start):
- **Provision** `budgeting` DB + role on the VPS Postgres (plain Postgres, no Supabase).
- **DECIDE: Hyperdrive reachability** — Cloudflare Tunnel (no open ports, more secure) vs allowlisted port 5432 (less setup). *Needs user input.*
- Apply schema to VPS: `prisma migrate deploy` (the single `init` migration builds everything fresh).
- **Prod env / Cloudflare Pages vars:** `DATABASE_URL`/`DIRECT_URL` (VPS), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the Pages prod URL), `RESEND_API_KEY`, `RESEND_FROM`. Update the Hyperdrive binding (id `0588de2028054413a9f8d7dba56bbbe5`) connection string to the VPS.
- **Preview deploy** → user smoke test → only then promote to prod (never deploy to prod without user confirming the preview — user rule).
- After stable: decommission Supabase Cloud (ask first — irreversible).

---

## Environment cheatsheet
- Local DB: Docker `budgeting-postgres-dev` on `:5434` (`budgeting`/`budgeting_dev`). `restart: unless-stopped`.
- `npm run db:up` / `npm run db:down` / `npm run dev` / `npm run build`.
- Migrations are non-interactive here: use `prisma migrate dev --create-only` then `prisma migrate deploy`.

## Known annoyance (not blocking)
The git-push deny hook false-positives on compound Bash commands (loops, `&&` chains, `${PIPESTATUS}`). Workaround: run as simple single commands. Fixing the hook matcher is optional cleanup.
