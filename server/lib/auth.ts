import type { H3Event } from 'h3'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins'
import { getPrisma } from '~~/server/utils/db'
import { sendMagicLinkEmail } from '~~/server/utils/mailer'

/**
 * Build a better-auth instance for the current request.
 *
 * better-auth needs a Prisma client and config at construction time, but this
 * app builds its Prisma client per-request from the Cloudflare Hyperdrive
 * binding (which only exists inside an event handler, not at module scope).
 * So — unlike a Node app with a module-level singleton — auth is constructed
 * per request via getPrisma(event). Secret/baseURL are sourced from the
 * request-scoped Cloudflare env, falling back to process.env for local dev.
 */
export function serverAuth(event: H3Event) {
  const cf = (event.context.cloudflare?.env ?? {}) as Record<string, string | undefined>
  const secret = cf.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET
  const baseURL = cf.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL

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
