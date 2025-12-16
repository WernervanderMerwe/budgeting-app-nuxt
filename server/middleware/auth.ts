import { serverSupabaseUser } from '#supabase/server'
import prisma from '~/server/utils/db'

// Cache profile tokens to avoid repeated DB lookups within the same process
const profileTokenCache = new Map<string, { token: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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
 *
 * This implements the DRY principle - profile token is fetched once
 * and made available to all API handlers via event.context.profileToken
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
    const user = await serverSupabaseUser(event)

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
        message: 'You must be logged in to access this resource',
      })
    }

    // Check cache first
    const cached = profileTokenCache.get(user.id)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      event.context.profileToken = cached.token
      event.context.user = user
      return
    }

    // Fetch profile token from profiles table
    const profile = await prisma.profile.findUnique({
      where: { authUserId: user.id },
      select: { profileToken: true },
    })

    if (!profile) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Profile Not Found',
        message: 'Your profile could not be found. Please contact support.',
      })
    }

    // Cache the token
    profileTokenCache.set(user.id, {
      token: profile.profileToken,
      timestamp: Date.now(),
    })

    // Hydrate event context
    event.context.profileToken = profile.profileToken
    event.context.user = user
  } catch (error: any) {
    // Re-throw HTTP errors
    if (error.statusCode) {
      throw error
    }

    console.error('Auth middleware error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Authentication Error',
      message: 'An error occurred during authentication',
    })
  }
})
