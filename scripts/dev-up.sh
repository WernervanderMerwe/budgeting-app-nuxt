#!/bin/bash
# Dev Up Script
#
# Starts the full local dev stack: Postgres + Mailpit containers + Nuxt dev server.
# Switches .env to local before starting Nuxt.
#
# Usage: pnpm dev:up

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "--- dev:up ---"

# --- 1. Check Docker is running ---
if ! docker info > /dev/null 2>&1; then
    echo ""
    echo "ERROR: Docker is not running."
    echo "  Start Docker Desktop (or the Docker daemon) and try again."
    exit 1
fi
echo "  Docker is running"

# --- 2. Check Postgres container is up; start if not ---
echo ""
echo "Checking Postgres..."
if docker exec budgeting-postgres-dev pg_isready -U budgeting -q 2>/dev/null; then
    echo "  Postgres is running"
else
    echo "  Local Postgres not running — starting..."
    pnpm db:up
    echo "  Postgres started"
fi

# --- 3. Start Nuxt dev server (foreground) ---
# .env is the single source of truth for dev — do NOT copy .env.local over it.
echo ""
echo "Starting Nuxt dev server (Ctrl+C to stop — run 'pnpm dev:down' to also stop Postgres)..."
echo ""
exec pnpm dev
