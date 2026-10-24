#!/bin/bash
#
# Version Bump Script
# Usage: ./scripts/version-bump.sh [major|minor|patch] ["optional release message"]
#
# Bumps version in package.json, commits, tags, and pushes to origin.
# Refuses to bump if the current branch is out of sync with origin —
# version bumps must happen on a clean, up-to-date branch so downstream
# deploys see them on origin.
#
# Run from `dev`, it then fast-forwards `main` to the bumped commit, pushes it,
# and switches back to dev — vps-deploy.sh checks HEAD against origin/main, not
# your current branch name, so dev (now equal to origin/main) is fine to deploy
# from. Staying on dev keeps you from ever landing an accidental direct commit
# on main. A version bump is only ever done in order to deploy, so making the
# caller hand-run switch/merge/push afterwards was pure ceremony.
#
# Pass --no-merge to bump without touching main.
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PACKAGE_JSON="$PROJECT_ROOT/package.json"
cd "$PROJECT_ROOT"

# --- Parse args (--no-merge may appear anywhere) ---
SKIP_MERGE=0
ARGS=()
for arg in "$@"; do
    if [ "$arg" = "--no-merge" ]; then SKIP_MERGE=1; else ARGS+=("$arg"); fi
done
set -- "${ARGS[@]}"

VERSION_TYPE="${1:-}"
CUSTOM_MESSAGE="${2:-}"

# --- Validate arguments ---
if [ -z "$VERSION_TYPE" ]; then
    echo -e "${RED}Error: Version type required${NC}"
    echo "Usage: $0 [major|minor|patch] [\"optional message\"] [--no-merge]"
    exit 1
fi

if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
    echo -e "${RED}Error: Invalid version type '$VERSION_TYPE'${NC}"
    echo "Must be one of: major, minor, patch"
    exit 1
fi

# --- Working tree must be clean (tracked + staged) ---
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo -e "${RED}Error: You have uncommitted changes. Commit or stash them first.${NC}"
    git status --short
    exit 1
fi

# --- Verify current branch is in sync with origin ---
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "HEAD" ]; then
    echo -e "${RED}Error: Detached HEAD. Switch to a branch first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Fetching origin...${NC}"
git fetch origin --quiet

if ! git rev-parse --verify "origin/$CURRENT_BRANCH" >/dev/null 2>&1; then
    echo -e "${RED}Error: origin/$CURRENT_BRANCH does not exist. Push the branch first.${NC}"
    exit 1
fi

LOCAL_SHA=$(git rev-parse "$CURRENT_BRANCH")
ORIGIN_SHA=$(git rev-parse "origin/$CURRENT_BRANCH")
if [ "$LOCAL_SHA" != "$ORIGIN_SHA" ]; then
    if git merge-base --is-ancestor "$CURRENT_BRANCH" "origin/$CURRENT_BRANCH" 2>/dev/null; then
        echo -e "${RED}Error: $CURRENT_BRANCH is behind origin/$CURRENT_BRANCH. Pull first.${NC}"
    elif git merge-base --is-ancestor "origin/$CURRENT_BRANCH" "$CURRENT_BRANCH" 2>/dev/null; then
        echo -e "${RED}Error: $CURRENT_BRANCH has unpushed commits. Push first:${NC}"
        echo -e "  ${YELLOW}git push origin $CURRENT_BRANCH${NC}"
    else
        echo -e "${RED}Error: $CURRENT_BRANCH and origin/$CURRENT_BRANCH have diverged.${NC}"
    fi
    exit 1
fi
echo -e "${GREEN}✓ $CURRENT_BRANCH in sync with origin${NC}"

# --- Compute new version ---
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$PACKAGE_JSON" | cut -d'"' -f4)
if [ -z "$CURRENT_VERSION" ]; then
    echo -e "${RED}Error: Could not read version from package.json${NC}"
    exit 1
fi
echo -e "${YELLOW}Current version: v$CURRENT_VERSION${NC}"

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
case "$VERSION_TYPE" in
    major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
    minor) NEW_VERSION="$MAJOR.$((MINOR + 1)).0" ;;
    patch) NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))" ;;
esac
echo -e "${GREEN}New version: v$NEW_VERSION${NC}"

# --- Tag must not already exist (locally or on origin) ---
if git tag -l "v$NEW_VERSION" | grep -q "v$NEW_VERSION"; then
    echo -e "${RED}Error: Tag v$NEW_VERSION already exists locally${NC}"
    exit 1
fi
if git ls-remote --tags origin "refs/tags/v$NEW_VERSION" | grep -q "v$NEW_VERSION"; then
    echo -e "${RED}Error: Tag v$NEW_VERSION already exists on origin${NC}"
    exit 1
fi

# --- Update package.json ---
echo "Updating package.json..."
sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"

# --- Build tag message ---
if [ -n "$CUSTOM_MESSAGE" ]; then
    TAG_MESSAGE="Release v$NEW_VERSION: $CUSTOM_MESSAGE"
else
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    if [ -n "$LAST_TAG" ]; then
        COMMIT_COUNT=$(git rev-list "$LAST_TAG"..HEAD --count)
        TAG_MESSAGE="Release v$NEW_VERSION: $COMMIT_COUNT commits since $LAST_TAG"
    else
        TAG_MESSAGE="Release v$NEW_VERSION"
    fi
fi

# --- Commit, tag, push ---
echo "Committing version bump..."
git add "$PACKAGE_JSON"
git commit -m "chore: bump version to v$NEW_VERSION"

echo "Creating tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "$TAG_MESSAGE"

echo "Pushing to origin..."
git push --follow-tags origin "$CURRENT_BRANCH"

echo ""
echo -e "${GREEN}✓ Version bumped to v$NEW_VERSION${NC}"
echo -e "${GREEN}✓ Tag v$NEW_VERSION pushed${NC}"
echo -e "${GREEN}✓ origin/$CURRENT_BRANCH at $(git rev-parse --short HEAD)${NC}"

# --- Fast-forward main to the bumped commit, ready to deploy ---
#
# Only from dev, and only as a fast-forward. A merge COMMIT would leave main's
# tip reading "Merge branch 'dev'" instead of the bump, which vps-deploy.sh
# checks for — so a non-ff situation is a genuine stop, not something to paper
# over by creating a merge commit automatically.
if [ "$CURRENT_BRANCH" != "dev" ] || [ "$SKIP_MERGE" = "1" ]; then
    echo ""
    if [ "$SKIP_MERGE" = "1" ]; then
        echo "Skipped the merge to main (--no-merge)."
    else
        echo "On '$CURRENT_BRANCH', not 'dev' — leaving main alone."
    fi
    echo "Next: merge into main, push, then: pnpm vps:deploy"
    exit 0
fi

echo ""
echo -e "${YELLOW}About to fast-forward main to v$NEW_VERSION and push it.${NC}"
echo "The qa gate is mandatory before dev -> main (docs/devops/lifecycle.md)."
if [ -t 0 ]; then
    read -r -p "Has 'pnpm qa:up' passed for this build? [y/N] " QA_OK || QA_OK=""
else
    echo -e "${YELLOW}stdin is not a terminal — cannot ask for qa-gate confirmation, so treating it as not confirmed.${NC}"
    QA_OK=""
fi
if [[ ! "$QA_OK" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Stopped. dev is bumped, tagged and pushed — main is untouched.${NC}"
    echo "dev already has this version, so do NOT re-run this script for it — a re-run"
    echo "would bump the version again (e.g. v$NEW_VERSION -> a new patch) instead of"
    echo "merging the one you already have."
    echo "Once 'pnpm qa:up' has passed, finish the merge by hand instead:"
    echo -e "  ${YELLOW}git switch main${NC}"
    echo -e "  ${YELLOW}git merge --ff-only dev${NC}"
    echo -e "  ${YELLOW}git push origin main${NC}"
    exit 1
fi

# Everything below is verified BEFORE switching branches, so a failure can
# never strand the caller on a half-merged main.
if ! git rev-parse --verify main >/dev/null 2>&1; then
    echo -e "${RED}Error: no local 'main' branch. Merge manually.${NC}"
    exit 1
fi
if [ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]; then
    echo -e "${RED}Error: local main and origin/main differ. Reconcile them first.${NC}"
    echo "   local:  $(git log -1 --format='%h %s' main)"
    echo "   origin: $(git log -1 --format='%h %s' origin/main)"
    exit 1
fi
if ! git merge-base --is-ancestor main dev; then
    echo -e "${RED}Error: main has commits dev does not, so this cannot fast-forward.${NC}"
    echo "   Bring them into dev first, re-run qa, then bump again:"
    echo -e "   ${YELLOW}git switch dev && git merge main${NC}"
    exit 1
fi

echo "Fast-forwarding main..."
git switch --quiet main
git merge --ff-only dev
git push origin main
git switch --quiet dev

echo ""
echo -e "${GREEN}✓ main fast-forwarded to v$NEW_VERSION and pushed${NC}"
echo -e "${GREEN}✓ Back on dev${NC}"
echo ""
echo "Next: pnpm vps:deploy"
