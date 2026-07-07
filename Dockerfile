# syntax=docker/dockerfile:1

# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm (built into Node 22; needed HERE because the
# bare alpine image has no pnpm — locally we use the global install)
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with pnpm store cache persisted across builds
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build (runs `prisma generate && nuxt build`; dummy URLs — generate only
# emits the client, no DB connection is made. DIRECT_URL is also required
# because prisma.config.ts's datasource block references it.)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DIRECT_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm build

# Production stage — slim runtime only
FROM node:22-alpine AS runner

WORKDIR /app

# Copy built output (Nitro bundles everything, no node_modules needed)
COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
