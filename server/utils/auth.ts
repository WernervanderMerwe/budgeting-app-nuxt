import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

/**
 * Get the authenticated user's profile token from the request
 * This is used for data pseudonymization - the profile_token replaces user_id
 * in all data tables to add an extra layer of privacy
 *
 * @param event - H3 event from the request
 * @returns The user's profile token (their Supabase user ID)
 * @throws Error if user is not authenticated
 */
export async function getProfileToken(event: H3Event): Promise<string> {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    })
  }

  // The profile token is the user's Supabase auth ID
  // This provides pseudonymization as it's separate from any PII
  return user.id
}

/**
 * Get the authenticated user from the request
 * Use this when you need access to the full user object
 *
 * @param event - H3 event from the request
 * @returns The authenticated Supabase user
 * @throws Error if user is not authenticated
 */
export async function requireAuth(event: H3Event) {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    })
  }

  return user
}

/**
 * Optional auth check - returns null if not authenticated instead of throwing
 * Use this for routes that have different behavior for authenticated vs anonymous users
 *
 * @param event - H3 event from the request
 * @returns The authenticated user or null
 */
export async function optionalAuth(event: H3Event) {
  try {
    return await serverSupabaseUser(event)
  } catch {
    return null
  }
}
