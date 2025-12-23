/**
 * Nitro plugin for Prisma cleanup.
 *
 * This plugin handles cleanup of per-request Prisma clients after the response.
 * The actual client creation happens lazily in getPrisma() from server/utils/db.ts.
 *
 * Note: We cannot create the Prisma client in the 'request' hook because
 * event.context.cloudflare is not yet available at that point in the lifecycle.
 * Cloudflare bindings are only accessible inside event handlers.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('afterResponse', async (event) => {
    // Cleanup Prisma client after response
    if (event.context.prisma) {
      try {
        await event.context.prisma.$disconnect()
      } catch {
        // Ignore disconnect errors
      }
    }

    // Cleanup pg Pool
    if (event.context._prismaPool) {
      try {
        await event.context._prismaPool.end()
      } catch {
        // Ignore pool end errors
      }
    }
  })
})
