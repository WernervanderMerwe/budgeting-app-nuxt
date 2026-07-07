# Phase 2e — VPS Postgres + Cloudflare Tunnel + Cutover

> **⚠️ SUPERSEDED (2026-07-07)** by `2026-07-07-phase2e-vps-hosted-cutover.md` — the app now deploys ON the VPS (ecom template: local Docker build → ghcr → VPS pull), so the Zero Trust / Hyperdrive / Pages steps (C, D, F, G) are dead. Steps A/B/E survive as existing VPS state.

**Date:** 2026-07-01
**Branch:** `migrate/vps-postgres-modern-stack`
**Prereq done:** Phase 2 local complete & verified (2a–2d). This is the infra/cutover.
Decisions locked with Werner:
- Reachability: **Cloudflare Tunnel** (no open DB ports).
- DB placement: **one neutral shared Postgres** at `/root/infra/postgres`, database-per-app + scoped roles. Ecom untouched. Future apps join here.
- No data migration — fresh start (new account).

---

## Progress (2026-07-01, updated)
- ✅ **Step A** — shared `infra-postgres` at `/root/infra/postgres` (loopback `127.0.0.1:5544`), `budgeting` DB + scoped role created. VPS documented at `/root/VPS-GUIDE.md`.
- ✅ **Step B** — `vps-infra` tunnel created (connector Healthy, JNB edge); `cloudflared` runs in the infra compose; published-application route `budget-db.wernerbuildsapps.co.za` → `tcp://postgres:5432` saved.
- ✅ **Step E** — `prisma migrate deploy` applied over SSH forward; **all 16 tables live** in the VPS `budgeting` schema.
- ⛔ **Step C — BLOCKED (user deferring):** Zero Trust plan-activation gate (Cloudflare demands a payment method to activate ZT Free, and loops back to the welcome page until a card is on file). Service Token + Access app can't be created until ZT is active. **Fallback:** create service token + Access app via Cloudflare REST API with a scoped token — but that ALSO needs ZT provisioned, so the plan gate must be cleared first regardless.
- ⏭️ **Step D** (Hyperdrive create/repoint with `--access-client-id/secret`), **F** (Pages env vars), **G** (preview→promote) all wait on Step C.
- Account id (from tunnel token): `02d0c4942d03497b0091284ba7ddfba9`. Existing Hyperdrive `budgeting-db` id `0588de2028054413a9f8d7dba56bbbe5` still points at Supabase.
- Separate/deferred: VPS security audit (Supabase pooler ufw-bypass exposure — user confirmed it IS internet-reachable; will handle later) + no-backups gap. Tracked in memory `vps-security-audit-pending`.

---

## Target architecture

```
Cloudflare Pages (budgeting-app)
   └─ HYPERDRIVE binding ─┐
                          │  (Access Service-Auth: client id/secret)
                          ▼
        Cloudflare Tunnel public hostname (e.g. budgeting-db.wernerbuildsapps.co.za, TCP)
                          │
                          ▼
        cloudflared (container on VPS)  ──►  tcp://postgres:5432
                          │
                          ▼
   /root/infra/postgres  (shared, app-neutral)
     ├─ db: budgeting   role: budgeting  (scoped)
     └─ db: <future>    role: <future>
```

No inbound ports opened. cloudflared dials **out** to Cloudflare. ufw stays 22/80/443.

---

## VPS state (recon 2026-07-01)
- HostAfrica / Proxmox / Ubuntu 24.04, root, Docker + nginx + ufw(deny-in except 22/80/443).
- ecom: `/root/apps/ecommerce-template`, `ecommerce-postgres` (pg16, vol `ecommerce-template_pgdata`, net `ecommerce-template_default`, **host-private**). **Do not touch.**
- Supabase appliance: `/opt/supabase-project`, supavisor pooler **published 0.0.0.0:5432/6543**, kong 8000/8443. (Bloat — decommission candidate later; also a ufw-bypass exposure to note.)
- Host port 5432 already taken by supabase pooler → shared instance admin port must be a different loopback port.
- cloudflared: **not installed** (clean).

---

## Values to confirm before executing
1. **Tunnel hostname** for the DB: proposed `budgeting-db.wernerbuildsapps.co.za` (zone already on Cloudflare). OK?
2. **Prod app URL** (for `BETTER_AUTH_URL` + magic-link links): the `*.pages.dev` URL or a custom domain? Need the exact origin.
3. **Deploy mechanism:** is Cloudflare Pages **git-connected** (auto-deploy on push) or do we `wrangler pages deploy`? Determines Step G.
4. **Cloudflare access for me:** do you have a `CLOUDFLARE_API_TOKEN` I can use for `wrangler` (Hyperdrive create + Pages), or do you drive those in the dashboard while I guide? (Tunnel/Zero-Trust steps are dashboard-only regardless.)

---

## Steps (each write action = confirm first)

### A. Shared Postgres on VPS  *(I run via SSH)*
1. Create `/root/infra/postgres/` with `docker-compose.yml`:
   - `postgres:16-alpine`, container `infra-postgres`, own volume `infra_pgdata`, own network `infra_default`.
   - Admin port bound **loopback only**, non-conflicting: `127.0.0.1:5544:5432`.
   - Superuser creds via `.env` (gitignored on VPS), strong generated password.
   - `restart: unless-stopped`, healthcheck.
   - `cloudflared` service (added in Step B once we have the token).
2. `docker compose up -d postgres`; verify healthy.
3. Create the app DB + **scoped** role (isolated from any future DB):
   ```sql
   CREATE ROLE budgeting LOGIN PASSWORD '<generated>';
   CREATE DATABASE budgeting OWNER budgeting;
   REVOKE CONNECT ON DATABASE budgeting FROM PUBLIC;
   GRANT CONNECT ON DATABASE budgeting TO budgeting;
   ```
   (schema `budgeting` created by Prisma migration; role owns its DB only.)
**Gate:** show compose + SQL before running.

### B. Cloudflare Tunnel  *(you in dashboard, I guide + wire container)*
1. **Networking → Tunnels → Create tunnel** (name e.g. `vps-infra`). Choose Docker; copy the **tunnel token**.
2. I add the `cloudflared` service to the compose with `TUNNEL_TOKEN=<token>` (VPS `.env`, gitignored) and `command: tunnel --no-autoupdate run`; `docker compose up -d cloudflared`. Verify tunnel shows **Healthy**.
3. Tunnel → **Published application routes / Public hostname**: `budgeting-db.wernerbuildsapps.co.za`, **Type = TCP**, URL = `tcp://postgres:5432` (cloudflared resolves `postgres` on `infra_default`). Save.

### C. Zero Trust Service Auth  *(you in dashboard)*
1. **Zero Trust → Access → Service Tokens → Create** (Non-expiring). Copy **Client ID + Secret**.
2. **Zero Trust → Access → Applications → Add → Self-hosted**; hostname = the tunnel hostname; policy **Action = Service Auth**, Include = Service Token = the one above; disable IdPs; session "expires immediately". Create.

### D. Create Hyperdrive config (tunnel-based)  *(wrangler or dashboard)*
```sh
npx wrangler hyperdrive create budgeting-vps \
  --host=budgeting-db.wernerbuildsapps.co.za \
  --user=budgeting --password='<generated>' --database=budgeting \
  --access-client-id=<CLIENT_ID> --access-client-secret=<CLIENT_SECRET>
# NOTE: no --port. Copy the returned Hyperdrive id.
```

### E. Schema + binding  *(I run)*
1. Update `wrangler.toml` `HYPERDRIVE` id → new id (**tracked file** — commit).
2. Apply schema to VPS DB over an SSH forward (keeps DB loopback-only):
   ```sh
   ssh -fN -L 5544:127.0.0.1:5544 vps
   DATABASE_URL='postgresql://budgeting:<pw>@127.0.0.1:5544/budgeting' \
   DIRECT_URL='postgresql://budgeting:<pw>@127.0.0.1:5544/budgeting' \
     npx prisma migrate deploy
   ```
   Verify tables in `budgeting` schema.

### F. Cloudflare Pages env vars  *(you in dashboard, or wrangler)*
Set on the **budgeting-app** Pages project (Production):
- `BETTER_AUTH_SECRET` (reuse local value or generate a prod one), `BETTER_AUTH_URL` = prod origin.
- `RESEND_API_KEY`, `RESEND_FROM` = `Budget App <noreply@send.wernerbuildsapps.co.za>`.
- Runtime uses the **HYPERDRIVE binding** for the DB, so `DATABASE_URL` is **not** needed at runtime (only used locally for migrations). Confirm none of the runtime code reads `process.env.DATABASE_URL` on CF (db.ts uses the binding first — ✓).

### G. Preview → smoke → promote  *(never prod without your OK)*
1. Preview deploy. Smoke test on the preview URL: request magic link → email arrives from Resend → click → signed in → Profile auto-created in **VPS** DB → both modes load.
2. Only after you confirm the preview: **promote to production**.

### H. Decommission Supabase  *(later, ask first — irreversible)*
- Remove `@nuxtjs/supabase` remnants already done in code. On infra: stop/remove the `/opt/supabase-project` stack + old Supabase Cloud project **only after** prod is stable for a while. Separate sit-down.

---

## Rollback
- Keep the **old Supabase Hyperdrive config** (`0588de20…`) until preview is verified; reverting = restore the old id in `wrangler.toml` + redeploy.
- Everything new is additive (new DB, new tunnel, new Hyperdrive) — ecom and Supabase untouched until Step H.

## Security notes
- No inbound ports added; DB reachable only via authenticated tunnel (Service Auth).
- Scoped role per database; `REVOKE CONNECT … FROM PUBLIC`.
- Separate note (not this task): Docker publishes supabase pooler on 0.0.0.0:5432/6543 **bypassing ufw** — worth locking down or decommissioning.
```
