import type { H3Event } from 'h3'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins'
import { getPrisma } from '~~/server/utils/db'
import { sendMagicLinkEmail } from '~~/server/utils/mailer'

/**
 * Build a better-auth instance for the current request.
 *
 * better-auth needs a Prisma client and config at construction time. auth is
 * constructed per request via getPrisma(event) — kept this way so callers
 * don't need to change even though the underlying Prisma client is now a
 * single shared instance for the Node process. Secret/baseURL are sourced
 * from process.env.
 */
export function serverAuth(event: H3Event) {
  const secret = process.env.BETTER_AUTH_SECRET
  const baseURL = process.env.BETTER_AUTH_URL

  // Fail fast on missing config: a missing secret makes session cookies
  // forgeable, and a missing baseURL lets better-auth infer the origin from the
  // request Host header — which would let an attacker poison the magic-link URL.
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not configured')
  }
  if (!baseURL) {
    throw new Error('BETTER_AUTH_URL is not configured')
  }

  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: [baseURL],
    database: prismaAdapter(getPrisma(event), { provider: 'postgresql' }),
    session: {
      expiresIn: 60 * 60 * 24 * 90, // 90-day session
      updateAge: 60 * 60 * 24, // refresh daily on use (sliding window)
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(event, { to: email, url })
        },
      }),
    ],
  })
}
