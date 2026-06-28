import { serverAuth } from '~~/server/lib/auth'

/**
 * Mounts the better-auth request handler at /api/auth/**.
 * Auth is built per-request (Hyperdrive binding only exists inside handlers).
 */
export default defineEventHandler((event) => {
  return serverAuth(event).handler(toWebRequest(event))
})
