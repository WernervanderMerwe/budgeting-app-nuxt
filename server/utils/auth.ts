import type { H3Event } from 'h3'

/**
 * Get the profile token from the event context.
 * This is populated by the auth middleware for all API routes.
 *
 * @param event - H3 event from the request
 * @returns The user's profile token (prf_xxx format)
 * @throws Error if profile token is not in context (middleware didn't run or auth failed)
 */
export function getProfileToken(event: H3Event): string {
  const profileToken = event.context.profileToken

  if (!profileToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  return profileToken
}

/**
 * Get the authenticated user from the event context.
 * This is populated by the auth middleware for all API routes.
 *
 * @param event - H3 event from the request
 * @returns The authenticated Supabase user
 * @throws Error if user is not in context
 */
export function getUser(event: H3Event) {
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  return user
}

/**
 * Check if the request is authenticated.
 * Useful for routes that behave differently for authenticated vs anonymous users.
 *
 * @param event - H3 event from the request
 * @returns true if authenticated, false otherwise
 */
export function isAuthenticated(event: H3Event): boolean {
  return !!event.context.profileToken && !!event.context.user
}
