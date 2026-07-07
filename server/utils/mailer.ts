import type { H3Event } from 'h3'
import { Resend } from 'resend'

/**
 * Send a magic-link sign-in email via Resend (HTTP API).
 */
export async function sendMagicLinkEmail(event: H3Event, opts: { to: string; url: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? 'Budget App <onboarding@resend.dev>'

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
