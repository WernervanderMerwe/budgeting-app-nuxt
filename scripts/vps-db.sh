#!/bin/bash
# vps-db.sh migrate — run prisma migrate deploy against the VPS infra-postgres
# over an SSH port-forward (the runtime image has no Prisma CLI).
set -e
[ "$1" = "migrate" ] || { echo "Usage: $0 migrate"; exit 1; }

LOCAL_PORT=5544

# Fail early if the port is already taken — otherwise the tunnel silently
# fails to bind and prisma would talk to whatever else is listening.
if ss -ltn "sport = :$LOCAL_PORT" 2>/dev/null | grep -q ":$LOCAL_PORT"; then
    echo "ERROR: local port $LOCAL_PORT is already in use (stale tunnel?)."
    echo "  Find it with:  ss -ltnp 'sport = :$LOCAL_PORT'"
    exit 1
fi

read -s -p "budgeting DB password (VPS /root/infra/postgres/.env): " PW; echo

# Background the tunnel WITHOUT -f so we keep a real PID to kill on exit.
# (`ssh -O cancel` only works with ControlMaster multiplexing, which this
# host is not configured for — the PID is the reliable handle.)
ssh -N -L "$LOCAL_PORT:127.0.0.1:$LOCAL_PORT" vps &
SSH_PID=$!
trap 'kill "$SSH_PID" 2>/dev/null || true' EXIT

# Wait for the forward to actually accept connections before running prisma.
for _ in $(seq 1 20); do
    if ss -ltn "sport = :$LOCAL_PORT" 2>/dev/null | grep -q ":$LOCAL_PORT"; then break; fi
    kill -0 "$SSH_PID" 2>/dev/null || { echo "ERROR: ssh tunnel died on startup."; exit 1; }
    sleep 0.5
done

DATABASE_URL="postgresql://budgeting:${PW}@127.0.0.1:$LOCAL_PORT/budgeting" \
DIRECT_URL="postgresql://budgeting:${PW}@127.0.0.1:$LOCAL_PORT/budgeting" \
npx prisma migrate deploy
