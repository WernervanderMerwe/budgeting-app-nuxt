# Session Notes - 2025-12-23

## Problem
Intermittent 500 errors on API endpoints (`/api/months`, `/api/months/[id]/summary`) in Cloudflare Workers production environment. The app works locally but fails in production.

## Root Cause (CONFIRMED)
**Two-part issue:**

### Part 1: globalThis Caching Pattern (Fixed in previous session)
The original `globalThis.prisma` caching pattern violates Cloudflare Workers' request context isolation. Each request runs in isolation; I/O objects from one request cannot be used in another.

### Part 2: Nitro Plugin Timing Issue (Fixed today)
The Nitro plugin's `request` hook runs **BEFORE** `event.context.cloudflare` is populated by Cloudflare. This caused:
1. Plugin runs → `event.context.cloudflare?.env?.HYPERDRIVE` is `undefined`
2. Plugin logs error and returns early → `event.context.prisma` is not set
3. API handler calls `getPrisma(event)` → no `event.context.prisma` found
4. Fallback creates `new PrismaClient()` without pg adapter → **broken on Workers**

**Evidence:**
- Supabase logs showed ZERO database connections from Cloudflare
- Nitro docs show `request` hook receives `req` not full `event`
- Cloudflare bindings only available in `defineEventHandler` context

## Solution Implemented

### 1. Hyperdrive Setup (Previous session)
- Created Hyperdrive config: `0588de2028054413a9f8d7dba56bbbe5`
- Added binding to `wrangler.toml`
- Uses Supabase DIRECT connection (port 5432), not pooler

### 2. Lazy Prisma Client Creation (Today's fix)
Moved Prisma client creation from Nitro plugin into `getPrisma()` function:

**Before (broken):**
```typescript
// server/plugins/prisma.ts - runs before cloudflare context exists
nitroApp.hooks.hook('request', async (event) => {
  const connectionString = event.context.cloudflare?.env?.HYPERDRIVE?.connectionString // UNDEFINED!
  // ...creates client...
  event.context.prisma = prisma
})
```

**After (fixed):**
```typescript
// server/utils/db.ts - runs inside event handler where cloudflare IS available
export function getPrisma(event: H3Event): PrismaClient {
  if (event.context.prisma) return event.context.prisma

  const connectionString = event.context.cloudflare?.env?.HYPERDRIVE?.connectionString
  if (connectionString) {
    // Production: create per-request client with Hyperdrive
    const pool = new Pool({ connectionString, max: 1 })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })
    event.context.prisma = prisma
    return prisma
  }

  // Development fallback
  return devClient || (devClient = new PrismaClient())
}
```

### 3. Plugin Simplified
The plugin now only handles cleanup in `afterResponse` hook.

## Key Learnings

1. **Nitro plugin hooks run early** - Before Cloudflare injects bindings into event context
2. **Use lazy initialization** - Create Prisma client when first needed, not at request start
3. **Cloudflare bindings available in event handlers** - Access via `event.context.cloudflare.env.BINDING_NAME`
4. **Hyperdrive handles pooling** - Use `max: 1` for per-request connections

## Files Modified
- `server/utils/db.ts` - Rewrote with lazy Prisma client creation
- `server/plugins/prisma.ts` - Simplified to cleanup-only
- `wrangler.toml` - Added Hyperdrive binding
- All 39 API endpoints - Updated to use `getPrisma(event)` pattern

## References
- [Cloudflare Nuxt bindings docs](https://developers.cloudflare.com/pages/framework-guides/deploy-a-nuxt-site/)
- [Nitro Cloudflare deployment](https://nitro.build/deploy/providers/cloudflare)
- [Prisma Issue #28193](https://github.com/prisma/prisma/issues/28193)
- Implementation plan: `~/.claude/plans/ancient-watching-sutherland.md`
