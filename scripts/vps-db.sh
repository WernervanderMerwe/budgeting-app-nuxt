#!/bin/bash
# vps-db.sh migrate — run prisma migrate deploy against the VPS infra-postgres
# over an SSH port-forward (the runtime image has no Prisma CLI).
set -e
[ "$1" = "migrate" ] || { echo "Usage: $0 migrate"; exit 1; }

read -s -p "budgeting DB password (VPS /root/infra/postgres/.env): " PW; echo
ssh -fN -L 5544:127.0.0.1:5544 vps
trap 'ssh -O cancel -L 5544:127.0.0.1:5544 vps 2>/dev/null || true' EXIT

DATABASE_URL="postgresql://budgeting:${PW}@127.0.0.1:5544/budgeting" \
DIRECT_URL="postgresql://budgeting:${PW}@127.0.0.1:5544/budgeting" \
npx prisma migrate deploy
