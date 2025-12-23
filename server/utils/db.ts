import type { H3Event } from 'h3'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Extend H3EventContext for type safety
declare module 'h3' {
  interface H3EventContext {
    prisma?: PrismaClient
    _prismaPool?: Pool
  }
}

// Development-only: reuse single client for local dev (no Cloudflare)
let devClient: PrismaClient | null = null

/**
 * Get Prisma client for the current request.
 *
 * In production (Cloudflare Workers), this creates a per-request client
 * using Hyperdrive's connection string from cloudflare bindings.
 * The client is created lazily when first needed - this is critical because
 * event.context.cloudflare is only available inside event handlers, not in
 * Nitro plugin hooks.
 *
 * In development, this returns a shared client for simplicity.
 */
export function getPrisma(event: H3Event): PrismaClient {
  // Return cached client for this request if already created
  if (event.context.prisma) {
    return event.context.prisma
  }

  // Try to get Hyperdrive connection string from Cloudflare bindings
  // This is available in production when running on Cloudflare Workers/Pages
  const hyperdriveConnectionString =
    event.context.cloudflare?.env?.HYPERDRIVE?.connectionString

  if (hyperdriveConnectionString) {
    // Production: Create per-request client with Hyperdrive
    const pool = new Pool({
      connectionString: hyperdriveConnectionString,
      max: 1, // Single connection per request (Hyperdrive handles pooling)
    })

    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    // Cache on event context for reuse within this request and cleanup
    event.context.prisma = prisma
    event.context._prismaPool = pool

    return prisma
  }

  // Development fallback: reuse single client
  // This works because in local dev, we're not in Cloudflare's edge environment
  if (!devClient) {
    devClient = new PrismaClient()
  }
  return devClient
}
