/**
 * Global client-side auth guard. Redirects unauthenticated users to /login.
 * Real enforcement happens server-side (server/middleware/auth.ts); this is UX.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Session check relies on the client auth plugin (window). Skip on server.
  if (import.meta.server) return

  const publicRoutes = ['/login', '/confirm', '/guide']
  const isPublic = publicRoutes.some(
    route => to.path === route || to.path.startsWith(route + '/'),
  )

  const { user, fetchSession } = useAuth()

  // Resolve the session once if we don't know it yet.
  if (user.value === null) {
    await fetchSession()
  }

  if (!user.value && !isPublic) {
    return navigateTo('/login')
  }

  if (user.value && to.path === '/login') {
    return navigateTo('/')
  }
})
