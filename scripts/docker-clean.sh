#!/bin/bash
#
# Docker clean — frees the disk each build and release leaves behind.
# Usage: bash scripts/docker-clean.sh [image] [keep-version]
#
#   - With an image and version: removes that image's local release tags
#     except <version>, <version>-migrate, latest and latest-migrate. GHCR
#     keeps every release, so the VPS can still pull an old one to roll back.
#   - Always: removes dangling images (each qa rebuild leaves one) and trims
#     the build cache to the 10GB used most recently (it is shared by every
#     project).
#
# Leaves containers and volumes alone. Stopped containers and their
# databases belong to other projects.
#
# Never fails: it runs at the end of qa:up and build-push.sh, and a cleanup
# problem must not fail a qa run or a push that already worked.

IMAGE="$1"
KEEP_VERSION="${2//./\\.}"
CACHE_KEEP="10GB"

if [ -n "$IMAGE" ] && [ -n "$KEEP_VERSION" ]; then
    # Release tags only (1.2.3, 1.2.3-migrate), so a hand-made tag survives.
    OLD_TAGS=$(docker images "$IMAGE" --format '{{.Tag}}' \
        | grep -xE '[0-9]+\.[0-9]+\.[0-9]+(-migrate)?' \
        | grep -vxE "$KEEP_VERSION|$KEEP_VERSION-migrate")
    for TAG in $OLD_TAGS; do
        if docker rmi "$IMAGE:$TAG" > /dev/null 2>&1; then
            echo "  removed $IMAGE:$TAG"
        else
            echo "  kept $IMAGE:$TAG (a container uses it)"
        fi
    done
fi

docker image prune -f > /dev/null
docker builder prune -f --reserved-space "$CACHE_KEEP" > /dev/null

docker system df
exit 0
