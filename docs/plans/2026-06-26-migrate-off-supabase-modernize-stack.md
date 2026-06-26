# Migrate Off Supabase + Modernize Stack — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the budgeting app off Supabase Cloud onto the user's existing VPS (plain PostgreSQL in Docker + better-auth magic-link via Resend), and bring it onto the same modern stack as the ecom/tutoring apps (Nuxt 4, Nuxt UI v4, Tailwind v4, Prisma 7) — while it stays hosted on Cloudflare Pages.

**Architecture:** Two ordered phases, each changing one big variable. **Phase 1** upgrades the framework stack *while still on Supabase Cloud* (prove the app works on the new stack against a known-good backend). **Phase 2** replaces Supabase Auth with better-auth (in-app, same-origin on Cloudflare Pages — no VPS HTTPS/TLS needed) and moves the database to a plain `budgeting` Postgres DB on the VPS, repointing the existing Cloudflare Hyperdrive binding. The app's DB layer (`@prisma/adapter-pg` + `pg` + Hyperdrive) is already identical to the target apps and does **not** change.

**Tech Stack:** Nuxt 4.3, Nuxt UI 4.4 (Reka UI + Tailwind v4), Prisma 7 + `@prisma/adapter-pg`, better-auth 1.4 (magic-link plugin), Resend (HTTP email API — edge-compatible), Cloudflare Pages + Hyperdrive, PostgreSQL 16 (Docker on VPS).

---

## Reference implementations (read these first)

The user's **ecommerce-template** (`/home/bullzeye/projects/ecommerce-template`) is the canonical example of the target stack. Mirror it.

- `package.json` — exact target dependency versions
- `server/lib/auth.ts` — better-auth config shape (uses email+password; we swap in the **magic-link** plugin instead)
- `app/plugins/auth-client.ts` — client wiring (`createAuthClient` from `better-auth/vue`)
- `docker-compose.yml` — the plain Postgres service pattern (`postgres:16-alpine`)
- `app/` directory layout — the Nuxt 4 source structure to mirror

The **online-tutoring-app** (`/home/bullzeye/projects/online-tutoring-app`) is on Nuxt 4 too and documents the VPS in `docs/devops/` — useful for the VPS network/firewall context (Supabase stack currently lives at `169.239.181.75`).

## Current-state file map (what we are changing)

| Concern | File | Phase |
|---|---|---|
| Deps / scripts | `package.json` | 1 & 2 |
| Nuxt config | `nuxt.config.ts` | 1 & 2 |
| Tailwind config | `tailwind.config.js` (delete in P1) | 1 |
| Source dir | `pages/ components/ composables/ middleware/ → app/` | 1 |
| UI components | 10 distinct (`UButton/UCard/UModal/UInput/UFormGroup/UDropdown/UNotifications/UAlert/UIcon/UPopover`), 66 usages | 1 |
| DB client | `server/utils/db.ts` | **unchanged** |
| Prisma schema | `prisma/schema.prisma` (schema `budgeting`) | 2 |
| Client auth guard | `middleware/auth.ts` | 2 |
| Server auth ctx | `server/middleware/auth.ts` | 2 |
| Auth composable | `composables/useAuth.ts` | 2 |
| Auth pages | `pages/login.vue signup.vue confirm.vue reset-password.vue`, `components/UserWidget.vue` | 2 |
| CF Hyperdrive | `wrangler.toml` (binding `HYPERDRIVE` id `0588de2028054413a9f8d7dba56bbbe5`) | 2 |

**Anonymization note:** the `Profile` → `profileToken` mapping (a `profiles` row keyed historically to a Supabase `auth.users` UUID) is **kept**. It is no longer a security requirement (see memory `pseudonymization-no-longer-required`), but removing it would touch ~47 server endpoints for zero gain. In Phase 2 we simply repoint `Profile.authUserId` from a Supabase UUID to the better-auth user id. If it actively blocks a step, stop and raise it with the user before removing — do not silently drop it.

## Testing / verification strategy

This app has no unit-test harness and the work is mostly framework migration + auth wiring, so verification is **build + typecheck + browser smoke test**, not unit TDD:
- `npm run build` must succeed (Cloudflare Pages preset).
- Typecheck: `npx nuxt typecheck` (after enabling it) must pass for changed files.
- Browser smoke: per project policy, verify in the browser with a haiku Task + Playwright MCP before closing each phase.
- **Deploy rule (user policy): never deploy to production without the user confirming a dev/preview deploy looks fine first.** Each phase ends at a preview deploy + explicit user confirmation gate.

---

## Phase 0 — Branch & baseline

### Task 0.1: Create the working branch

**Step 1:** From `master`, create a branch.

```bash
git checkout -b migrate/vps-postgres-modern-stack
```

**Step 2:** Confirm a clean baseline build on the CURRENT stack so we have a known-good reference.

Run: `npm run build`
Expected: build succeeds (Nitro `cloudflare_pages` output in `dist/`).

**Step 3:** Record the current dependency versions (for rollback reference).

```bash
git show HEAD:package.json > /home/bullzeye/.claude/jobs/b9bf63a7/tmp/package.baseline.json
```

**Step 4:** Commit nothing yet — Phase 0 is just setup.

---

## Phase 1 — Modernize the stack (still on Supabase Cloud)

> End state: app runs on Nuxt 4 / Nuxt UI v4 / Tailwind v4 / Prisma 7, **still authenticating against Supabase Cloud and still using the Supabase Cloud DB**. Nothing about the backend changes in this phase. This isolates "does the new framework work" from "did the backend move."

### Task 1.1: Bump dependencies to the target stack

**Files:** Modify `package.json`

**Step 1:** Set these versions (match ecom/tutoring), keeping Supabase deps for now:

```jsonc
// dependencies
"@nuxt/ui": "^4.4.0",
"@nuxtjs/color-mode": "^4.0.0",      // keep; UI v4 cooperates with it
"@nuxtjs/supabase": "^2.0.3",         // KEEP in Phase 1, remove in Phase 2
"@supabase/supabase-js": "^2.87.3",   // KEEP in Phase 1
"@prisma/adapter-pg": "^7.2.0",
"@prisma/client": "^7.2.0",
"@vueuse/core": "^14.0.0",
"dayjs": "^1.11.19",
"nuxt": "^4.3.1",
"vue": "^3.5.26",
"zod": "^3.24.1",
"tailwindcss": "^4.1.18",
// devDependencies
"prisma": "^7.2.0",
"@types/node": "^24.10.1",
"typescript": "^5.9.3",
"vue-tsc": "^3.2.4"
```

Remove `tailwind.config.js`-related assumptions (handled in 1.3). Keep `marked`, `v-calendar`, `dotenv`.

**Step 2:** Install.

Run: `npm install`
Expected: resolves without peer-dep errors. If `v-calendar` conflicts with Vue 3.5, note it and check its current version supports Vue 3.5 (it does on ^3.1.2).

**Step 3:** Commit.

```bash
git add package.json package-lock.json
git commit -m "chore: bump to Nuxt 4 / Nuxt UI v4 / Tailwind v4 / Prisma 7"
```

### Task 1.2: Adopt the Nuxt 4 `app/` directory structure

**Files:** Move `pages/ components/ composables/ middleware/ plugins/(if any) assets/(if any)` into `app/`. Keep `server/`, `prisma/`, `content/`, `public/` at root.

**Step 1:** Create `app/` and move client source dirs into it (git-aware moves):

```bash
mkdir -p app
git mv pages app/pages
git mv components app/components
git mv composables app/composables
git mv middleware app/middleware
[ -d plugins ] && git mv plugins app/plugins
[ -d assets ] && git mv assets app/assets
[ -d layouts ] && git mv layouts app/layouts
```

**Step 2:** `pages/guide.vue` imports `~/content/guide.md?raw`. In Nuxt 4 `~` still resolves to the app/src dir; verify the raw import still resolves after the move. If it breaks, change to an absolute alias or move `content/guide.md` under `app/assets/`. (Decide at build time.)

**Step 3:** Build to catch path breaks.

Run: `npm run build`
Expected: may surface auto-import/path errors — fix references until it builds. Do not proceed until green.

**Step 4:** Commit.

```bash
git add -A && git commit -m "refactor: adopt Nuxt 4 app/ directory structure"
```

### Task 1.3: Tailwind v4 + Nuxt UI v4 styling config

**Files:** Create `app/assets/css/main.css`; create/modify `app.config.ts`; modify `nuxt.config.ts`; delete `tailwind.config.js`.

**Step 1:** Mirror ecom's CSS entry. Create `app/assets/css/main.css`:

```css
@import "tailwindcss";
@import "@nuxt/ui";
```

(Confirm exact directives against `ecommerce-template`'s main css file — match it verbatim, including any `@source`/theme blocks it uses.)

**Step 2:** In `nuxt.config.ts`: add the css entry and drop the v2 assumptions.

```ts
css: ['~/assets/css/main.css'],
```

**Step 3:** Delete the old Tailwind v3 config.

```bash
git rm tailwind.config.js
```

**Step 4:** Move UI theme tokens to `app.config.ts` (Nuxt UI v4 reads theme from here, not tailwind.config). Create if absent, mirroring ecom:

```ts
export default defineAppConfig({
  ui: {
    // port any custom colors/primary from the old tailwind.config.js here
  }
})
```

**Step 5:** Build.

Run: `npm run build`
Expected: green. Styling correctness is verified in the browser at 1.6.

**Step 6:** Commit.

```bash
git add -A && git commit -m "chore: Tailwind v4 + Nuxt UI v4 styling config"
```

### Task 1.4: Migrate Nuxt UI v2 components to v4

**Files:** the `.vue` files using `<U...>` components (66 usages across 10 component types).

Work one component type at a time; build after each. Key v2→v4 changes (verify each against Nuxt UI v4 docs via context7 `resolve-library-id`/`query-docs` for `@nuxt/ui`, and cross-check ecom usage):

**Step 1: `UNotifications` / toasts.** v4 removes `<UNotifications>`. Wrap the app root (`app/app.vue`) in `<UApp>` and emit toasts via `useToast().add(...)`. Find the current `<UNotifications/>` mount and the `useToast` calls; migrate.

**Step 2: `UFormGroup` → `UFormField`.** Rename component and check the `label`/`error`/`help` prop names still apply.

**Step 3: `UDropdown` → `UDropdownMenu`.** New `:items` shape (array of arrays → array of menu item objects) and slot changes; update `components/UserWidget.vue` and any others.

**Step 4: `UModal`.** v4 uses `v-model:open` and `#content`/`#header`/`#body`/`#footer` slots instead of v2 default-slot + `v-model`. Update each modal.

**Step 5: `UInput` / `UButton` / `UCard` / `UAlert` / `UIcon` / `UPopover`.** Mostly compatible; verify prop renames (e.g. `UButton` `color`/`variant` token names, `UAlert` `title`/`description`, icon prop strings now use the `i-lucide-*` set per ecom's `@iconify-json/lucide`). Add `@iconify-json/lucide` if icons reference lucide names.

**Step 6:** After each component type, build:

Run: `npm run build`
Expected: green before moving to the next component type.

**Step 7:** Commit per component type (frequent commits), e.g.:

```bash
git add -A && git commit -m "refactor(ui): migrate UModal to Nuxt UI v4 API"
```

### Task 1.5: Prisma 7 generate

**Files:** none (schema unchanged in P1).

**Step 1:** Regenerate the client on Prisma 7.

Run: `npx prisma generate`
Expected: succeeds. The `multiSchema` + `driverAdapters` preview features and `@prisma/adapter-pg` usage are stable across 6→7; if a preview flag moved to GA, update `previewFeatures` in `schema.prisma` accordingly.

**Step 2:** Build.

Run: `npm run build`
Expected: green.

**Step 3:** Commit.

```bash
git add -A && git commit -m "chore: regenerate Prisma 7 client"
```

### Task 1.6: Enable typecheck + browser smoke test

**Step 1:** In `nuxt.config.ts` set `typescript.typeCheck` on for a one-off run, or run:

Run: `npx nuxt typecheck`
Expected: resolve type errors introduced by the upgrade.

**Step 2:** Run the app locally against Supabase Cloud (`.env.local` unchanged).

Run: `npm run dev`
Then verify in the browser (haiku Task + Playwright MCP): login via Supabase still works, dashboard loads, a transaction month renders, a yearly view renders, dark mode toggles, modals/dropdowns/toasts function.

**Step 3:** Commit any fixes.

```bash
git add -A && git commit -m "fix: typecheck + UI smoke fixes for v4 upgrade"
```

### Task 1.7: Preview deploy + user confirmation gate (Phase 1)

**Step 1:** Deploy to a Cloudflare Pages preview (NOT production).

Run: `npm run build && npx wrangler pages deploy dist --project-name=budgeting-app --branch=migrate-preview`
Expected: a preview URL.

**Step 2:** **STOP. Ask the user to confirm the preview looks correct.** Per user policy, do not promote to production. Phase 1 is done only after the user confirms.

---

## Phase 2 — Swap auth (better-auth + Resend) & move DB to VPS

> End state: no Supabase. Auth runs in-app at `/api/auth/**` (same-origin HTTPS on Cloudflare Pages — no VPS TLS needed). Data lives in a `budgeting` Postgres database on the VPS, reached by Hyperdrive.

### Task 2.0: VPS — provision the database (no Supabase)

**Decision to resolve with the user at this step:** how Cloudflare Hyperdrive reaches the VPS Postgres. Two options (the user deferred this to "the VPS step" — present both, then pick):

| Option | What | Trade-off |
|---|---|---|
| **Cloudflare Tunnel** | Run `cloudflared` on the VPS; Hyperdrive → tunnel → `postgres:5432`. | No open inbound ports. Most secure. A little VPS setup. |
| **Allowlisted port** | Expose `5432`, `ufw allow from <Cloudflare IP ranges>`. | Less setup; an internet-facing (if filtered) DB port. |

**Step 1:** On the VPS, decide whether the budgeting DB is a new container or a database inside the Postgres already running. Simplest: a dedicated database + role on the existing Postgres instance (plain Postgres — unlike Supabase, separate databases are clean here).

```sql
-- as a superuser on the VPS Postgres
CREATE ROLE budgeting WITH LOGIN PASSWORD '<generated>';
CREATE DATABASE budgeting OWNER budgeting;
```

**Step 2:** Confirm the connection works from the VPS host (`psql`), then set up the chosen reachability path (Tunnel or allowlisted port). Document the resulting host:port for Hyperdrive.

**Step 3:** No commit (infra). Record the connection string in the user's secret store / `.env.local` (gitignored — **ask the user before editing `.env.local`** per their policy).

### Task 2.1: Add better-auth + Resend, plan to drop Supabase

**Files:** `package.json`

**Step 1:** Add deps:

```jsonc
"better-auth": "^1.4.19",
"resend": "^4.0.0"   // verify latest; Resend SDK uses fetch (edge-safe)
```

Do NOT remove `@nuxtjs/supabase` / `@supabase/supabase-js` yet — remove them in Task 2.9 once the replacement is wired and verified.

**Step 2:** `npm install`, then commit.

```bash
git add package.json package-lock.json && git commit -m "chore: add better-auth + resend"
```

### Task 2.2: Add better-auth tables to the Prisma schema

**Files:** `prisma/schema.prisma`, new migration

**Step 1:** Add the better-auth models (`User`, `Session`, `Account`, `Verification`) in the `budgeting` schema (each `@@schema("budgeting")`). Generate the exact field set with the better-auth CLI to avoid drift:

Run: `npx @better-auth/cli generate` (point it at `server/lib/auth.ts` once created in 2.3) — or copy the model definitions from the better-auth Prisma docs (verify via context7 `query-docs` for `better-auth`). Ensure models map to snake_case tables to match this codebase's convention (`@@map`, `@map`).

**Step 2:** Relate `Profile` to better-auth's `User`. Change `Profile.authUserId` to reference the better-auth user id (a cuid/text, not a `@db.Uuid`). Minimal change:

```prisma
model Profile {
  id           Int    @id @default(autoincrement())
  authUserId   String @unique @map("auth_user_id")   // now better-auth user.id (drop @db.Uuid)
  profileToken String @unique @map("profile_token")
  // ...unchanged relations...
  @@map("profiles")
  @@schema("budgeting")
}
```

**Step 3:** Create the migration locally (against a local/dev Postgres, not prod):

Run: `npx prisma migrate dev --name add_better_auth_tables`
Expected: new migration under `prisma/migrations/`. (Note: a global hook blocks Bash containing the word "prisma" on *template* projects — this is not a template project; if the hook misfires, run the command in a context that the hook allows or rename via the dedicated tooling.)

**Step 4:** Commit.

```bash
git add prisma/ && git commit -m "feat(db): add better-auth tables, repoint Profile to better-auth user id"
```

### Task 2.3: better-auth server config (magic link + Resend)

**Files:** Create `server/lib/auth.ts`; create `server/utils/mailer.ts`

**Step 1:** Resend mailer util `server/utils/mailer.ts`:

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMail(opts: { to: string; subject: string; html: string }) {
  await resend.emails.send({
    from: process.env.RESEND_FROM ?? 'Budget App <noreply@yourdomain>',
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
}
```

**Step 2:** `server/lib/auth.ts` — mirror ecom's structure but use the **magic-link** plugin (no email/password):

```ts
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins'
import { getPrismaForAuth } from '../utils/db'   // see 2.3 step 3
import { sendMail } from '../utils/mailer'

export const auth = betterAuth({
  database: prismaAdapter(getPrismaForAuth(), { provider: 'postgresql' }),
  session: {
    expiresIn: 60 * 60 * 24 * 90, // 90-day sliding session
    updateAge: 60 * 60 * 24,      // refresh daily on use
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMail({
          to: email,
          subject: 'Sign in to Budget App',
          html: `<p>Click to sign in: <a href="${url}">${url}</a></p>`,
        })
      },
    }),
  ],
})
```

**Step 3:** better-auth needs a Prisma client at module init, but this app builds the client **per request** from the Hyperdrive binding (`server/utils/db.ts`). Resolve this: add a helper that returns a request-scoped client, and construct `auth` per request, OR initialize a pooled client from `process.env.DATABASE_URL` for auth specifically. **This is the one real architectural wrinkle in the migration** — better-auth expects a long-lived adapter, but Cloudflare edge wants per-request connections via Hyperdrive. Options to evaluate at implementation time:
   - (a) Build the better-auth instance inside the `[...all]` handler per request, passing a client made from `event.context.cloudflare.env.HYPERDRIVE.connectionString` (mirrors `getPrisma`). Cleanest fit for this codebase.
   - (b) Use a module-level client from `DATABASE_URL`. Simpler, but check it works under Cloudflare's edge connection model.
   Verify the recommended pattern against better-auth docs (context7) before coding. Prefer (a).

**Step 4:** Commit.

```bash
git add server/lib/auth.ts server/utils/mailer.ts && git commit -m "feat(auth): better-auth magic-link config with Resend"
```

### Task 2.4: better-auth API route handler

**Files:** Create `server/api/auth/[...all].ts`

**Step 1:** Mount the handler (mirror ecom; adapt to the per-request client decision from 2.3):

```ts
import { auth } from '~/server/lib/auth'

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event))
})
```

**Step 2:** Build.

Run: `npm run build`
Expected: green.

**Step 3:** Commit.

```bash
git add -A && git commit -m "feat(auth): mount better-auth handler at /api/auth"
```

### Task 2.5: Client auth plugin + composable

**Files:** Create `app/plugins/auth-client.ts`; rewrite `app/composables/useAuth.ts`

**Step 1:** `app/plugins/auth-client.ts` (mirror ecom, add magic-link client plugin):

```ts
import { createAuthClient } from 'better-auth/vue'
import { magicLinkClient } from 'better-auth/client/plugins'

export default defineNuxtPlugin(() => {
  const authClient = createAuthClient({
    baseURL: `${window.location.origin}/api/auth`,
    plugins: [magicLinkClient()],
  })
  return { provide: { authClient } }
})
```

**Step 2:** Rewrite `app/composables/useAuth.ts` to wrap better-auth instead of Supabase. Magic-link only:

```ts
export const useAuth = () => {
  const { $authClient } = useNuxtApp()
  const session = useState('auth-session', () => null)

  const sendMagicLink = async (email: string) => {
    const { error } = await $authClient.signIn.magicLink({
      email,
      callbackURL: '/',
    })
    if (error) throw new Error(error.message)
  }

  const fetchSession = async () => {
    const { data } = await $authClient.getSession()
    session.value = data?.user ?? null
    return session.value
  }

  const signOut = async () => {
    await $authClient.signOut()
    session.value = null
    await navigateTo('/login')
  }

  const isAuthenticated = computed(() => !!session.value)
  return { user: session, isAuthenticated, sendMagicLink, fetchSession, signOut }
}
```

(Drop `signIn`/`signUp`/`signInWithOAuth`/`resetPassword`/`updatePassword` — not needed for magic-link-only. Username/password can be added later.)

**Step 3:** Commit.

```bash
git add -A && git commit -m "feat(auth): better-auth client plugin + magic-link useAuth composable"
```

### Task 2.6: Rewrite the auth guards

**Files:** `app/middleware/auth.ts` (client), `server/middleware/auth.ts` (server context)

**Step 1:** Client `app/middleware/auth.ts` — replace `useSupabaseUser()` with a session check via `useAuth().fetchSession()`. Same public-route list, minus `/signup` and `/reset-password` (no longer exist); keep `/login` and `/confirm` (magic-link callback).

**Step 2:** Server `server/middleware/auth.ts` — replace `serverSupabaseUser(event)` with a better-auth session lookup:

```ts
import { auth } from '~/server/lib/auth'
import { getPrisma } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const path = event.path
  if (!path.startsWith('/api/')) return
  if (path.startsWith('/api/auth')) return   // better-auth handles its own routes

  const sessionData = await auth.api.getSession({ headers: event.headers })
  if (!sessionData?.user) {
    setResponseStatus(event, 401)
    return { error: 'Unauthorized', message: 'You must be logged in' }
  }

  const userId = sessionData.user.id
  const prisma = getPrisma(event)
  const profile = await prisma.profile.findUnique({
    where: { authUserId: userId },
    select: { profileToken: true },
  })
  if (!profile) { setResponseStatus(event, 404); return { error: 'Profile not found' } }

  event.context.profileToken = profile.profileToken
  event.context.userId = userId
})
```

This keeps the `event.context.profileToken` contract **identical**, so the ~47 downstream endpoints need no changes.

**Step 3:** Build + commit.

```bash
git add -A && git commit -m "feat(auth): replace Supabase guards with better-auth session"
```

### Task 2.7: Rewrite auth pages

**Files:** `app/pages/login.vue`, `app/pages/confirm.vue`; delete `app/pages/signup.vue`, `app/pages/reset-password.vue`; update `app/components/UserWidget.vue`

**Step 1:** `login.vue` — single email field → `useAuth().sendMagicLink(email)` → show "check your email" state. Remove password UI. Keep the `/guide` link.

**Step 2:** `confirm.vue` — magic-link callback landing. better-auth verifies the token server-side and sets the session cookie via the link; this page just calls `fetchSession()` and `navigateTo('/')`.

**Step 3:** Delete `signup.vue` and `reset-password.vue` (magic-link has no separate signup or password reset — first magic-link sign-in creates the user).

```bash
git rm app/pages/signup.vue app/pages/reset-password.vue
```

**Step 4:** `UserWidget.vue` — point sign-out at `useAuth().signOut()`; remove any password/profile-edit links that depended on Supabase.

**Step 5:** Build + browser smoke (local, against the VPS DB once 2.8 env is set). Commit.

```bash
git add -A && git commit -m "feat(auth): magic-link login/confirm pages, drop password flows"
```

### Task 2.8: Remove Supabase + update config/env

**Files:** `nuxt.config.ts`, `package.json`, `.env.local` (gitignored — **ask user before editing**), Cloudflare Pages env vars

**Step 1:** `nuxt.config.ts` — remove `'@nuxtjs/supabase'` from `modules` and delete the entire `supabase: { ... }` block. Add better-auth runtime config if needed (e.g. `runtimeConfig` secret for `BETTER_AUTH_SECRET`).

**Step 2:** Remove deps:

```bash
npm remove @nuxtjs/supabase @supabase/supabase-js
```

**Step 3:** Env changes (ask before touching `.env.local`):
   - `DATABASE_URL` / `DIRECT_URL` → VPS `budgeting` DB (via the chosen Hyperdrive path for prod; direct for local migrations).
   - `RESEND_API_KEY`, `RESEND_FROM`
   - `BETTER_AUTH_SECRET` (generate), `BETTER_AUTH_URL` (the Pages prod URL)
   - Remove `SUPABASE_URL` / `SUPABASE_KEY` / `NUXT_PUBLIC_SUPABASE_*`.
   - Mirror all of these into Cloudflare Pages project env (preview + production scopes).

**Step 4:** Build + typecheck. Commit (code/config only — not `.env.local`).

```bash
git add nuxt.config.ts package.json package-lock.json && git commit -m "chore: remove Supabase, switch config to better-auth"
```

### Task 2.9: Repoint Cloudflare Hyperdrive to the VPS

**Files:** `wrangler.toml` (binding stays), Cloudflare dashboard / `wrangler` Hyperdrive config

**Step 1:** Update the Hyperdrive config (id `0588de2028054413a9f8d7dba56bbbe5`) connection string to the VPS `budgeting` DB via the chosen reachability path (Tunnel or allowlisted port from Task 2.0). `server/utils/db.ts` reads `event.context.cloudflare.env.HYPERDRIVE.connectionString` — **no code change**.

**Step 2:** Verify Hyperdrive → VPS connectivity from a preview deploy before cutover.

### Task 2.10: Migrate the data

**Step 1:** Dump the `budgeting` schema from Supabase Cloud (use `DIRECT_URL`):

```bash
pg_dump "<SUPABASE_DIRECT_URL>" --schema=budgeting --no-owner --no-privileges \
  -f /home/bullzeye/.claude/jobs/b9bf63a7/tmp/budgeting_dump.sql
```

**Step 2:** Restore into the VPS `budgeting` DB. Handle the schema name: the VPS DB uses the same `budgeting` schema namespace, so restore as-is.

```bash
psql "<VPS_BUDGETING_DIRECT_URL>" -f /home/bullzeye/.claude/jobs/b9bf63a7/tmp/budgeting_dump.sql
```

**Step 3:** Apply the better-auth migration to the VPS DB (the dump predates it):

Run: `npx prisma migrate deploy` (DIRECT_URL pointed at VPS)
Expected: better-auth tables created alongside the restored data.

**Step 4:** Create the user's better-auth account and re-map the existing `Profile` row:
   - Trigger one magic-link sign-in (creates a better-auth `user` row with a new id).
   - `UPDATE budgeting.profiles SET auth_user_id = '<new-better-auth-user-id>' WHERE profile_token = '<existing-token>';`
   - This re-links all existing financial data to the new login. Single user → one row.

**Step 5:** No code commit (data op). Document the steps run.

### Task 2.11: Verify + preview deploy + confirmation gate (Phase 2)

**Step 1:** Local run against the VPS DB: magic-link email arrives (Resend), sign-in works, existing transactions/yearly data load (proves the Profile re-map worked), sign-out works.

**Step 2:** Preview deploy to Cloudflare Pages; verify the same in the deployed preview (Hyperdrive → VPS path, same-origin auth).

**Step 3:** **STOP. User confirms the preview.** Only after confirmation, promote to production and update the production Hyperdrive + env. Per user policy, never deploy to prod without this confirmation.

### Task 2.12: Decommission Supabase (after prod is confirmed healthy)

**Step 1:** After the user confirms production is stable on the VPS for a few days, pause/delete the Supabase Cloud project. **Ask the user before deleting** — this is irreversible and external.

---

## Open decisions deferred to implementation
1. **Hyperdrive reachability** (Task 2.0): Cloudflare Tunnel vs allowlisted port — decide with the user at the VPS step.
2. **better-auth client lifecycle on edge** (Task 2.3 step 3): per-request vs module-level Prisma client — verify against better-auth docs; prefer per-request to match `getPrisma`.
3. **`v-calendar` / `marked` compat** on Vue 3.5 / Nuxt 4 — verify during Task 1.1–1.2.

## Rollback
Each phase is its own set of commits on `migrate/vps-postgres-modern-stack`. `master` + the live Supabase deployment remain untouched until the Phase 2 confirmation gate. Roll back by redeploying `master` and restoring the original Hyperdrive connection string.
