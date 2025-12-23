import { serverSupabaseUser } from '#supabase/server'
import { getPrisma } from '~/server/utils/db'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/_nuxt',
  '/api/__nuxt',
]

// Check if a route is public (doesn't require auth)
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path.startsWith(route))
}

/**
 * Server middleware that hydrates event.context with profileToken
 * for all authenticated API requests.
 */
export default defineEventHandler(async (event) => {
  const path = event.path

  // Only process API routes
  if (!path.startsWith('/api/')) {
    return
  }

  // Skip public routes
  if (isPublicRoute(path)) {
    return
  }

  try {
    // serverSupabaseUser returns JWT claims where ID is in 'sub' field
    const user = await serverSupabaseUser(event)

    if (!user) {
      setResponseStatus(event, 401)
      return { error: 'Unauthorized', message: 'You must be logged in' }
    }

    // JWT claims use 'sub' for user ID, not 'id'
    const userId = (user as any).sub as string

    if (!userId) {
      setResponseStatus(event, 401)
      return { error: 'Unauthorized', message: 'Invalid token' }
    }

    // Fetch profile token from profiles table (no caching for now)
    const prisma = getPrisma(event)
    const profile = await prisma.profile.findUnique({
      where: { authUserId: userId },
      select: { profileToken: true },
    })

    if (!profile) {
      setResponseStatus(event, 404)
      return { error: 'Profile not found' }
    }

    // Hydrate event context
    event.context.profileToken = profile.profileToken
    event.context.userId = userId
  } catch (error: any) {
    console.error('Auth middleware error:', error)
    setResponseStatus(event, 500)
    return { error: 'Authentication error', details: error.message }
  }
})
