# Nuxt + Prisma + Cloudflare Workers: Database Connection Analysis

## Executive Summary

The intermittent 500 errors are caused by **Cloudflare Workers request context isolation conflicting with the globalThis connection caching pattern**. This is a fundamental architectural mismatch, not a configuration issue.

---

## Part 1: High-Level Overview - What Cloudflare Workers Requires

### The Edge Runtime Model

Cloudflare Workers use **V8 isolates** (not Node.js), which have strict constraints:

1. **Request Context Isolation**: Each request runs in isolation. I/O objects (streams, connections, sockets) created in one request **cannot be accessed from another request**.

2. **No Persistent Connections**: Unlike traditional servers, Workers don't maintain long-lived connections between requests. Each invocation is ephemeral.

3. **Environment Variables**: Only accessible within the request lifecycle, not in global scope.

4. **6 Concurrent Connection Limit**: Workers can only have 6 open TCP connections at once.

### What This Means for Databases

Traditional apps: Create one connection pool at startup, reuse across all requests.
Edge/Workers: Must create fresh connection **per request** OR use a connection pooler that handles this.

**Sources:**
- [Cloudflare Workers Connection Lifecycle](https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/)
- [Workers Databases Guide](https://developers.cloudflare.com/workers/databases/connecting-to-databases/)

---

## Part 2: Recommended Architecture for Nuxt + Prisma + Cloudflare

### Option A: Hyperdrive (Cloudflare's Solution) - RECOMMENDED

Cloudflare explicitly recommends Hyperdrive for PostgreSQL access from Workers:

> "When you use Hyperdrive, database client connections within the Worker are only kept alive for the duration of a single invocation. When your Worker finishes, the connection is garbage collected. However, Hyperdrive keeps the connection to your origin database open in the pool."

**How it works:**
```
Worker Request → Hyperdrive (edge pooler) → Supabase PostgreSQL
     ↓                    ↓
  Short-lived          Persistent
  connection          connections
  per request          to origin
```

**Setup:**
1. Create Hyperdrive config with Supabase **direct** connection (port 5432, NOT pooler 6543)
2. Add Hyperdrive binding to wrangler config
3. Access `env.HYPERDRIVE.connectionString` in request handler
4. Create new Prisma client per request with that connection string

**Supabase-specific note:** Use DIRECT connection, not pooler. Hyperdrive does the pooling.

### Option B: Prisma Accelerate (Prisma's Solution)

Prisma's managed connection pooler that works at edge:
- No driver adapters needed
- Add `withAccelerate()` extension
- Uses HTTP under the hood
- Separate service, may have latency

### Option C: Per-Request Client WITHOUT Pooler

Create new Prisma client per request. Works but:
- Each request does full TCP+TLS handshake (7 round trips)
- High latency
- Can exhaust Supabase connection limits

---

## Part 3: What's Wrong with Current Implementation

### Current Code Pattern (`server/utils/db.ts`)

```typescript
// PROBLEM: Caching client globally
if (globalThis.prisma) return globalThis.prisma

// PROBLEM: Pool created once, reused
const pool = new Pool({ connectionString, max: 1 })
const adapter = new PrismaPg(pool)
globalThis.prisma = new PrismaClient({ adapter })
```

### Why This Fails

1. **globalThis Caching Violates Workers Isolation**
   - First request: Creates pool, adapter, client - works
   - Second request: Tries to use cached client
   - Workers throws: "Cannot perform I/O on behalf of a different request"
   - Or silently hangs because connection is in stale state

2. **Pool Survives Request but Connection Doesn't**
   - The Pool object exists in globalThis
   - But the underlying TCP socket was garbage collected
   - Next request tries to use dead connection

3. **Promise Resolution Order Issues**
   - The nested proxy adds multiple `.then()` chains
   - In unstable connection state, promises may hang indefinitely
   - Explains "seems like promises don't resolve in logical order"

4. **Known Prisma Bug** ([Issue #28193](https://github.com/prisma/prisma/issues/28193))
   - "Worker Hangs when Reusing Prisma Client with Hyperdrive"
   - First request works, subsequent requests hang
   - Exact symptom described in session notes

### The Session Notes Match This Exactly

> "The app worked earlier in the session (5 successful refreshes in headless browser) but then started failing consistently."

This is the classic pattern:
1. Cold start → fresh client → works
2. Worker stays warm → reuses cached client → fails
3. Worker evicted → cold start → works again

---

## Part 4: Solution Options Ranked

### 1. Hyperdrive + Per-Request Client (Best for Current Stack)

**Pros:**
- Native Cloudflare solution
- Free connection pooling
- Minimal code changes (same Prisma, same queries)
- Works with existing Supabase

**Cons:**
- Need to set up Hyperdrive config
- Need to access connection string per-request

**Changes Required:**
- Create Hyperdrive config via wrangler CLI
- Modify `db.ts` to create fresh client per request
- Pass connection string through event context

### 2. Prisma Accelerate

**Pros:**
- Officially supported by Prisma
- No driver adapter needed
- Works on any edge provider

**Cons:**
- Additional service
- May have higher latency than Hyperdrive
- Another dependency

### 3. Switch to Drizzle ORM + Supabase HTTP

**Pros:**
- HTTP-based, no TCP connection issues
- Supabase-native
- Growing ecosystem (NuxtHub uses Drizzle)

**Cons:**
- Rewrite all 39 API endpoints
- Learn new ORM syntax
- Migration of existing code

### 4. Switch to Supabase Client (No ORM)

**Pros:**
- Native edge support
- No ORM complexity
- Auto-generated types from Supabase

**Cons:**
- Rewrite all API endpoints
- Less type safety than Prisma
- Different query patterns

---

## Part 5: Implementation Plan (APPROVED)

**Chosen approach:** Hyperdrive + Middleware pattern

### Step 1: Set Up Hyperdrive via Wrangler CLI

Get Supabase DIRECT connection string (port 5432, NOT 6543):

```bash
# Create Hyperdrive config
npx wrangler hyperdrive create budgeting-db \
  --connection-string="postgres://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres"
```

This outputs a Hyperdrive ID to use in config.

### Step 2: Update nuxt.config.ts

```typescript
nitro: {
  preset: 'cloudflare_pages',
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
    wrangler: {
      hyperdrive: [{
        binding: 'HYPERDRIVE',
        id: '<hyperdrive-id-from-step-1>'
      }]
    }
  },
  experimental: {
    wasm: true,
  },
  rollupConfig: {
    external: ['cloudflare:sockets'],
  },
  alias: {
    'pg-native': './node_modules/unenv/dist/runtime/mock/empty.mjs',
  },
}
```

### Step 3: Create Nitro Plugin for Prisma Context

Create `server/plugins/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

declare module 'h3' {
  interface H3EventContext {
    prisma: PrismaClient
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', async (event) => {
    // Get connection string from Hyperdrive or fallback
    const connectionString =
      event.context.cloudflare?.env?.HYPERDRIVE?.connectionString ||
      process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('No database connection string available')
    }

    // Create per-request pool and client
    const pool = new Pool({
      connectionString,
      max: 1, // Single connection per request
    })

    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    // Attach to event context
    event.context.prisma = prisma
  })

  nitroApp.hooks.hook('afterResponse', async (event) => {
    // Cleanup after response
    if (event.context.prisma) {
      await event.context.prisma.$disconnect()
    }
  })
})
```

### Step 4: Simplify server/utils/db.ts

```typescript
// server/utils/db.ts
import type { H3Event } from 'h3'
import { PrismaClient } from '@prisma/client'

// Development-only: direct client (for local dev without Cloudflare)
let devClient: PrismaClient | null = null

export function getPrisma(event: H3Event): PrismaClient {
  // Production: Use per-request client from plugin
  if (event.context.prisma) {
    return event.context.prisma
  }

  // Development fallback: reuse single client
  if (!devClient) {
    devClient = new PrismaClient()
  }
  return devClient
}
```

### Step 5: Update API Endpoints Pattern

All endpoints change from:
```typescript
import prisma from '~/server/utils/db'
// await prisma.model.findMany(...)
```

To:
```typescript
import { getPrisma } from '~/server/utils/db'
// const prisma = getPrisma(event)
// await prisma.model.findMany(...)
```

This is a simple search-replace across all 39 endpoints.

---

## Part 6: Files to Modify

| File | Change |
|------|--------|
| `nuxt.config.ts` | Add Hyperdrive binding + cloudflare config |
| `server/plugins/prisma.ts` | NEW - Nitro plugin for per-request client |
| `server/utils/db.ts` | Simplify to getPrisma(event) function |
| 39 API endpoints | Update imports and add `getPrisma(event)` call |

### Detailed File List for API Endpoints

```
server/api/months/index.get.ts
server/api/months/index.post.ts
server/api/months/latest.get.ts
server/api/months/[id].get.ts
server/api/months/[id].patch.ts
server/api/months/[id].delete.ts
server/api/months/[id]/summary.get.ts
server/api/categories/index.post.ts
server/api/categories/[id].patch.ts
server/api/categories/[id].delete.ts
server/api/fixed-payments/index.post.ts
server/api/fixed-payments/[id].patch.ts
server/api/fixed-payments/[id].delete.ts
server/api/transactions/index.post.ts
server/api/transactions/[id].patch.ts
server/api/transactions/[id].delete.ts
server/api/yearly/index.get.ts
server/api/yearly/index.post.ts
server/api/yearly/latest.get.ts
server/api/yearly/by-year/[year].get.ts
server/api/yearly/[id].get.ts
server/api/yearly/[id].patch.ts
server/api/yearly/[id].delete.ts
server/api/yearly/[id]/summary.get.ts
server/api/yearly/[id]/copy-month.post.ts
server/api/yearly/[id]/clear-month.post.ts
server/api/yearly/income-sources/index.post.ts
server/api/yearly/income-sources/[id].patch.ts
server/api/yearly/income-sources/[id].delete.ts
server/api/yearly/income-entries/[id].patch.ts
server/api/yearly/deductions/index.post.ts
server/api/yearly/deductions/[id].patch.ts
server/api/yearly/deductions/[id].delete.ts
server/api/yearly/sections/[id].patch.ts
server/api/yearly/categories/index.post.ts
server/api/yearly/categories/[id].patch.ts
server/api/yearly/categories/[id].delete.ts
server/api/yearly/category-entries/[id].patch.ts
server/api/yearly/category-entries/bulk.post.ts
```

---

## Part 7: Implementation Steps (Order of Execution)

1. **Set up Hyperdrive** (requires Cloudflare account access)
   - Get Supabase direct connection string
   - Run `wrangler hyperdrive create`
   - Note the returned ID

2. **Update nuxt.config.ts** with Hyperdrive binding

3. **Create server/plugins/prisma.ts** (the middleware)

4. **Rewrite server/utils/db.ts** (simplified version)

5. **Update all API endpoints** (search-replace operation)

6. **Test locally** with `npm run dev`

7. **Build and deploy** with `npm run build` and `npx wrangler pages deploy`

8. **Verify in production** with multiple sequential requests

---

## Sources

- [Cloudflare Hyperdrive + Supabase](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/supabase/)
- [Prisma Deploy to Cloudflare](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare)
- [Prisma Issue #28193 - Worker Hangs](https://github.com/prisma/prisma/issues/28193)
- [Prisma Discussion - Right Way for Workers](https://github.com/prisma/prisma/discussions/23762)
- [Nitro Cloudflare Deployment](https://nitro.build/deploy/providers/cloudflare)
- [Workers Connection Lifecycle](https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/)
