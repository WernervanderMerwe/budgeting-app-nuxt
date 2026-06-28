import dayjs from 'dayjs'
import { serverAuth } from '~~/server/lib/auth'
import { getPrisma } from '~~/server/utils/db'

// API route prefixes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/_nuxt',
  '/api/__nuxt',
]

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + '/')
}

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => matchesPrefix(path, route))
}

/**
 * Server middleware that resolves the better-auth session and hydrates
 * event.context.profileToken for all authenticated API requests.
 *
 * Keeps the profileToken contract identical to the previous Supabase setup so
 * the ~47 downstream endpoints need no changes. On first sign-in (no data
 * migration — fresh start) it auto-provisions a Profile for the new user.
 */
export default defineEventHandler(async (event) => {
  const path = event.path

  if (!path.startsWith('/api/')) return
  if (matchesPrefix(path, '/api/auth')) return // better-auth owns its own routes
  if (isPublicRoute(path)) return

  try {
    const session = await serverAuth(event).api.getSession({ headers: event.headers })

    if (!session?.user) {
      setResponseStatus(event, 401)
      return { error: 'Unauthorized', message: 'You must be logged in' }
    }

    const userId = session.user.id
    const prisma = getPrisma(event)

    // Look up the profile; create one on first sign-in.
    let profile = await prisma.profile.findUnique({
      where: { authUserId: userId },
      select: { profileToken: true },
    })

    if (!profile) {
      const now = dayjs().unix()
      try {
        profile = await prisma.profile.create({
          data: {
            authUserId: userId,
            profileToken: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
          },
          select: { profileToken: true },
        })
      } catch (createError: any) {
        // Concurrent first requests race to create the Profile; authUserId is
        // unique, so all but one hit P2002. Re-fetch the winner's row.
        if (createError?.code === 'P2002') {
          profile = await prisma.profile.findUnique({
            where: { authUserId: userId },
            select: { profileToken: true },
          })
        } else {
          throw createError
        }
      }
    }

    if (!profile) {
      setResponseStatus(event, 500)
      return { error: 'Profile resolution failed' }
    }

    event.context.profileToken = profile.profileToken
    event.context.userId = userId
  } catch (error: any) {
    console.error('Auth middleware error:', error)
    setResponseStatus(event, 500)
    return { error: 'Authentication error' }
  }
})
