import type { H3Event } from 'h3'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Single shared client + pool for the lifetime of the Node process.
// Prisma 7 requires a driver adapter (the schema datasource no longer carries
// a url - it lives in prisma.config.ts for CLI/migrations only).
let client: PrismaClient | null = null

/**
 * Get the Prisma client. The event parameter is kept so the ~47 call sites
 * (and the per-request better-auth construction) stay untouched.
 */
export function getPrisma(_event?: H3Event): PrismaClient {
  if (!client) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    // An idle client losing its backend connection (DB restart, network blip)
    // emits 'error' on the pool; unhandled, that crashes the whole process.
    pool.on('error', (err) => console.error('pg pool error', err))
    const adapter = new PrismaPg(pool)
    client = new PrismaClient({ adapter })
  }
  return client
}
