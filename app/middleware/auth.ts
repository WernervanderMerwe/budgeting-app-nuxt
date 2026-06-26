/**
 * Auth middleware - redirects unauthenticated users to login
 * Applied globally via nuxt.config.ts supabase.redirectOptions
 * This middleware is for additional route-specific control
 */
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/confirm', '/reset-password']

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route =>
    to.path === route || to.path.startsWith(route + '/')
  )

  // If not authenticated and trying to access protected route
  if (!user.value && !isPublicRoute) {
    return navigateTo('/login')
  }

  // If authenticated and trying to access login/signup, redirect to home
  if (user.value && (to.path === '/login' || to.path === '/signup')) {
    return navigateTo('/')
  }
})
