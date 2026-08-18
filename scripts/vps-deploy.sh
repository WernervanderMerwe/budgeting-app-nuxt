#!/bin/bash
# VPS Production Deploy Script
#
# GHCR-based deploy — no on-VPS builds. Desktop builds the Docker image,
# pushes it to GHCR, then the VPS pulls the image + latest code and restarts.
#
# Flow (no TAG arg):
#   1. Verify we're on main (does NOT auto-switch — error out if not)
#   2. Verify working tree clean
#   3. Fetch origin, verify local main == origin/main
#   4. Verify last commit on main is a version bump (warn + confirm if not)
#   5. Build & push image to GHCR (scripts/build-push.sh)
#   6. SSH to VPS: git pull, docker compose pull, restart, prune
#
# Flow (TAG arg given — rollback/pin):
#   1-4 same checks as above
#   5. Skip build entirely
#   6. SSH to VPS: scripts/vps-pull.sh <TAG>
#
# Usage:
#   pnpm vps:deploy            # build, push, deploy current package.json version
#   pnpm vps:deploy 0.1.14     # rollback/pin — skip build, deploy a specific tag

set -e

IMAGE="ghcr.io/wernervandermerwe/budgeting-app"
SSH_HOST="vps"
APP_DIR="/root/apps/budgeting-app"

TAG="$1"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- 1. Must be on main (no auto-switch) ---
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Not on main (currently on '$CURRENT_BRANCH').${NC}"
    echo "   Deploys run from main. Merge your changes into main first, then:"
    echo -e "     ${YELLOW}git switch main${NC}"
    exit 1
fi

# --- 2. Working tree must be clean ---
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}❌ Working tree is dirty. Commit or stash changes first.${NC}"
    git status --short
    exit 1
fi

# --- 3. Fetch origin and verify main is in sync ---
echo -e "${YELLOW}🔄 Fetching origin...${NC}"
git fetch origin --quiet

if [ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]; then
    echo -e "${RED}❌ Local main out of sync with origin/main.${NC}"
    echo "   local:  $(git log -1 --format='%h %s' main)"
    echo "   origin: $(git log -1 --format='%h %s' origin/main)"
    echo "   Reconcile (push or pull) before deploying."
    exit 1
fi
echo -e "  ${GREEN}✅ main in sync with origin${NC}"

# --- 4. Verify last commit on main is a version bump ---
LAST_MSG=$(git log -1 --format=%s main)
if [[ ! "$LAST_MSG" =~ ^chore:\ bump\ version ]]; then
    echo -e "${YELLOW}⚠️  Last commit on main is not a version bump:${NC}"
    echo "   $LAST_MSG"
    echo ""
    read -p "   Continue anyway? [y/N] " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# --- 4b. Warn if migrations changed since the last release tag ---
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ] && [ -n "$(git diff --name-only "$LAST_TAG"..HEAD -- prisma/migrations/)" ]; then
    echo -e "${YELLOW}⚠️  prisma/migrations changed since $LAST_TAG.${NC}"
    echo -e "   Run ${YELLOW}pnpm vps:db:migrate${NC} after (or before) this deploy."
fi

if [ -n "$TAG" ]; then
    # --- Rollback / pin path: skip build, pull a specific tag on the VPS ---
    echo ""
    echo -e "${YELLOW}📦 Deploying pinned tag $IMAGE:$TAG (skipping build)${NC}"

    echo ""
    echo -e "${YELLOW}🚀 Pulling on VPS...${NC}"
    ssh "$SSH_HOST" "cd $APP_DIR && bash scripts/vps-pull.sh $TAG"

    DEPLOYED_VERSION="$TAG (pinned)"
else
    # --- Normal path: build on desktop, push to GHCR, pull + restart on VPS ---
    VERSION=$(node -p "require('./package.json').version")
    echo ""
    echo -e "${YELLOW}📦 Deploying v$VERSION to production${NC}"

    echo ""
    echo -e "${YELLOW}🔨 Building & pushing image...${NC}"
    bash scripts/build-push.sh

    echo ""
    echo -e "${YELLOW}🚀 Deploying on VPS...${NC}"
    ssh "$SSH_HOST" "cd $APP_DIR && git pull origin main && docker compose --profile production pull && docker compose --profile production up -d && docker image prune -f"

    DEPLOYED_VERSION="v$VERSION"
fi

echo ""
echo -e "${GREEN}🎉 Deploy complete!${NC}"
echo "   Version: $DEPLOYED_VERSION"
echo ""
echo -e "   ${YELLOW}pnpm vps:logs${NC}      # Tail VPS container logs"
echo -e "   ${YELLOW}pnpm vps:status${NC}    # Check container status"
