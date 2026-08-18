# Deployment Guide

Bare VPS (HostAfrica) running Nginx + Cloudflare proxy.
The app runs in Docker on port 3200 (localhost only), Nginx reverse proxies to it.
Cloudflare handles SSL termination to Nginx with an Origin Certificate for end-to-end encryption.

The database is the **shared `infra-postgres` container** (`/root/infra/postgres` on the VPS,
reached over the external `infra_default` network) — there is no per-app postgres for this
app, unlike the ecom template.

---

## First-time setup

```bash
# 1. Clone repo
cd /root/apps
git clone https://github.com/WernervanderMerwe/budgeting-app-nuxt budgeting-app
cd budgeting-app

# 2. Create production env
cp .env.production.example .env.production
nano .env.production   # fill in all values; DB password lives in /root/infra/postgres/.env

# 3. Pull and start
bash scripts/vps-pull.sh

# 4. Run migrations from the desktop (not on the VPS) — see "Migrations" below
#    pnpm vps:db:migrate

# 5. Set up Nginx
sudo cp deploy/nginx/budgeting-app.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/budgeting-app.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Cloudflare DNS setup

1. Add an **A record**: `budget` pointing to the VPS IP, **Proxy ON** (orange cloud)
2. Check SSL mode is **Full (Strict)**
3. Origin Certificate is shared with ecom (covers `*.wernerbuildsapps.co.za`), already at:
   - `/etc/ssl/cloudflare/cert.pem`
   - `/etc/ssl/cloudflare/key.pem`

---

## Pipeline

```bash
pnpm vps:deploy
```

One command, run from the desktop on `main`. It gates on: being on `main`, a clean working
tree, and local `main` matching `origin/main`; it warns (and asks) if the last commit isn't a
version bump, and warns separately if `prisma/migrations` changed since the last release tag.
It then builds the image locally, pushes `:x.y.z` and `:latest` to
`ghcr.io/wernervandermerwe/budgeting-app`, and has the VPS `git pull`, `docker compose
--profile production pull`, `up -d`, and prune the old image.

**Rollback / pin a specific version** — skips the build, has the VPS pull and run that tag
directly:

```bash
pnpm vps:deploy 0.1.14
```

See `docs/devops/lifecycle.md` for the full dev → qa → production flow this fits into.

---

## Migrations (differs from ecom!)

The runtime image contains **only `.output`** — no Prisma CLI, no `node_modules`, no
`prisma/` folder. So ecom's `docker compose exec app npx prisma db push` pattern does not
work here. Migrations are run **from the desktop**, wrapped by:

```bash
pnpm vps:db:migrate
```

This runs `scripts/vps-db.sh migrate`, which opens an SSH port-forward into the VPS's
`infra-postgres` container, prompts for the `budgeting` DB password (read from the VPS's
`/root/infra/postgres/.env`), then runs `prisma migrate deploy` against the forwarded port
with both `DATABASE_URL` and `DIRECT_URL` set (`prisma.config.ts` references both). The
tunnel is torn down automatically when the command exits.

There is no seed step and no uploads volume for this app.

---

## Useful commands

```bash
pnpm vps:logs      # tail container logs (docker logs -f budgeting-app)
pnpm vps:status    # container status (docker ps | grep budgeting)

# Direct on the VPS, if needed:
docker compose --profile production logs -f app
docker compose --profile production restart app
```
