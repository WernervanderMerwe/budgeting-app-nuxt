#!/bin/bash
#
# Build & Push Docker image to GHCR
# Usage: ./scripts/build-push.sh
#
# Reads version from package.json, builds the Docker image,
# and pushes it to GHCR with both version tag and :latest.
#
# Prerequisites:
#   echo $GITHUB_PAT | docker login ghcr.io -u YOUR_USERNAME --password-stdin
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PACKAGE_JSON="$PROJECT_ROOT/package.json"

IMAGE="ghcr.io/wernervandermerwe/budgeting-app"

# Read version from package.json
VERSION=$(grep -o '"version": "[^"]*"' "$PACKAGE_JSON" | cut -d'"' -f4)
if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Could not read version from package.json${NC}"
    exit 1
fi

echo -e "${YELLOW}Building $IMAGE:$VERSION${NC}"

# Build
cd "$PROJECT_ROOT"
docker build -t "$IMAGE:$VERSION" -t "$IMAGE:latest" .

echo -e "${GREEN}✓ Built $IMAGE:$VERSION${NC}"

# Push
echo ""
echo -e "${YELLOW}Pushing to GHCR...${NC}"
docker push "$IMAGE:$VERSION"
docker push "$IMAGE:latest"

echo ""
echo -e "${GREEN}✓ Pushed $IMAGE:$VERSION${NC}"
echo -e "${GREEN}✓ Pushed $IMAGE:latest${NC}"
echo ""
echo "On VPS, run:"
echo -e "  ${YELLOW}bash scripts/vps-pull.sh${NC}"
echo "  or"
echo -e "  ${YELLOW}bash scripts/vps-pull.sh $VERSION${NC}"
