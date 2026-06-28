import { createAuthClient } from 'better-auth/vue'
import { magicLinkClient } from 'better-auth/client/plugins'

/**
 * Client-only: the auth client talks to the same-origin /api/auth endpoints.
 */
export default defineNuxtPlugin(() => {
  const authClient = createAuthClient({
    baseURL: `${window.location.origin}/api/auth`,
    plugins: [magicLinkClient()],
  })

  return {
    provide: { authClient },
  }
})
