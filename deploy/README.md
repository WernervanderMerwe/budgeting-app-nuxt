# Deployment Guide

Bare VPS (HostAfrica) running Nginx + Cloudflare proxy.
The app runs in Docker on port 3200 (localhost only), Nginx reverse proxies to it.
Cloudflare handles SSL termination to Nginx with an Origin Certificate for end-to-end encryption.

The database is the **shared `infra-postgres` container** (`/root/infra/postgres` on the VPS,
reached over the external `postgres_default` network) — there is no per-app postgres for this
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

# 4. Run migrations (see "Migrations" below — done from the desktop, not on the VPS)

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
# On the desktop — build and push the image
./scripts/build-push.sh

# On the VPS — pull and restart
bash scripts/vps-pull.sh
```

---

## Migrations (differs from ecom!)

The runtime image contains **only `.output`** — no Prisma CLI, no `node_modules`, no
`prisma/` folder. So ecom's `docker compose exec app npx prisma db push` pattern does not
work here. Migrations are run **from the desktop**, over an SSH port-forward into the VPS's
`infra-postgres` container:

```bash
# 1. Open a port-forward to infra-postgres on the VPS (background, no shell)
ssh -fN -L 5544:127.0.0.1:5544 vps

# 2. Run the migration from the desktop, pointing at the forwarded port.
#    Both DATABASE_URL and DIRECT_URL are required — prisma.config.ts references both.
DATABASE_URL='postgresql://budgeting:<pw>@127.0.0.1:5544/budgeting' \
DIRECT_URL='postgresql://budgeting:<pw>@127.0.0.1:5544/budgeting' \
npx prisma migrate deploy
```

Close the forward afterwards with `ssh -O cancel -L 5544:127.0.0.1:5544 vps` (or kill the
background `ssh` process).

There is no seed step and no uploads volume for this app.

---

## Useful commands

```bash
docker compose --profile production logs -f app
docker compose --profile production restart app
docker logs -f budgeting-app
```
