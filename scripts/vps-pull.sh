#!/bin/bash
#
# Pull & restart on VPS
# Usage: ./scripts/vps-pull.sh [version]
#
# Examples:
#   ./scripts/vps-pull.sh          # Pulls :latest
#   ./scripts/vps-pull.sh 0.2.0    # Pulls specific version
#
# Run this ON the VPS from the project directory.
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

IMAGE="ghcr.io/wernervandermerwe/budgeting-app"
TAG="${1:-latest}"

echo -e "${YELLOW}Pulling $IMAGE:$TAG${NC}"
docker pull "$IMAGE:$TAG"

# If a specific version was requested, retag it as :latest so docker-compose uses it
if [ "$TAG" != "latest" ]; then
    echo "Tagging $IMAGE:$TAG as $IMAGE:latest"
    docker tag "$IMAGE:$TAG" "$IMAGE:latest"
fi

echo ""
echo -e "${YELLOW}Restarting containers...${NC}"
docker compose --profile production up -d app

# Cleanup old images
docker image prune -f

echo ""
echo -e "${GREEN}✓ Deployed $IMAGE:$TAG${NC}"
docker ps | grep budgeting
echo ""
echo "Logs: docker logs -f budgeting-app"
