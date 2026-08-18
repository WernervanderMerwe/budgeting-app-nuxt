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

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PACKAGE_JSON="$PROJECT_ROOT/package.json"
cd "$PROJECT_ROOT"

# --- Validate arguments ---
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version type required${NC}"
    echo "Usage: $0 [major|minor|patch] [\"optional message\"]"
    exit 1
fi

VERSION_TYPE="$1"
CUSTOM_MESSAGE="$2"

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
echo ""
echo "Next: merge dev -> main, push, then: pnpm vps:deploy"
