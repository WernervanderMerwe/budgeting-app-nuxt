#!/bin/bash
# Dev Down Script
#
# Stops the full local dev stack: kills the Nuxt dev server and stops Postgres/Mailpit.
#
# Usage: pnpm dev:down

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "--- dev:down ---"

# --- 1. Kill Nuxt dev server (port 3000) ---
echo "Stopping Nuxt dev server..."
pnpm dev:kill 2>/dev/null || true
echo "  Done"

# --- 2. Stop Postgres/Mailpit containers ---
echo ""
echo "Stopping Postgres/Mailpit..."
pnpm db:down
echo "  Done"

echo ""
echo "Dev stack stopped."
