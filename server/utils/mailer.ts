import type { H3Event } from 'h3'
import { Resend } from 'resend'

/**
 * Read a runtime env var. On Cloudflare Pages the values live on the
 * request-scoped binding env (process.env is not populated with secrets);
 * locally they come from process.env (loaded from .env.local).
 */
function runtimeEnv(event: H3Event, key: string): string | undefined {
  const cf = (event.context.cloudflare?.env ?? {}) as Record<string, string | undefined>
  return cf[key] ?? process.env[key]
}

/**
 * Send a magic-link sign-in email via Resend (HTTP API — edge-safe).
 */
export async function sendMagicLinkEmail(event: H3Event, opts: { to: string; url: string }) {
  const apiKey = runtimeEnv(event, 'RESEND_API_KEY')
  const from = runtimeEnv(event, 'RESEND_FROM') ?? 'Budget App <onboarding@resend.dev>'

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const resend = new Resend(apiKey)

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 16px;">Sign in to Budget App</h2>
      <p style="color: #444; line-height: 1.5;">Click the button below to sign in. This link expires shortly and can only be used once.</p>
      <p style="margin: 24px 0;">
        <a href="${opts.url}" style="background: #16a34a; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; display: inline-block;">Sign in</a>
      </p>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">If the button doesn't work, paste this URL into your browser:<br>${opts.url}</p>
      <p style="color: #aaa; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `

  const { error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: 'Sign in to Budget App',
    html,
  })

  if (error) {
    throw new Error(`Failed to send magic link email: ${error.message ?? String(error)}`)
  }
}
