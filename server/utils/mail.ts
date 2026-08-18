import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface MailResult {
  sent: boolean
  error?: string
}

/** Escape user-supplied values before interpolating into email HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Lazy singleton transport — created once on first use
let _transport: Transporter | null = null

function getTransport(): Transporter | null {
  const host = process.env['NUXT_SMTP_HOST']
  if (!host) {
    console.warn('[mail] NUXT_SMTP_HOST is not set — email sending is disabled')
    return null
  }

  if (_transport) return _transport

  const port = parseInt(process.env['NUXT_SMTP_PORT'] ?? '587', 10)
  const user = process.env['NUXT_SMTP_USER']
  const pass = process.env['NUXT_SMTP_PASS']

  _transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined
  })

  return _transport
}

/**
 * Send a transactional email. Fail-soft: never throws — returns { sent: false } on error.
 * Set NUXT_SMTP_HOST to enable; if unset, logs a warning and skips silently.
 */
export async function sendMail(options: MailOptions): Promise<MailResult> {
  try {
    const transport = getTransport()
    if (!transport) return { sent: false, error: 'NUXT_SMTP_HOST not set' }

    const from = process.env['NUXT_SMTP_FROM'] ?? 'Budget App <noreply@send.wernerbuildsapps.co.za>'

    await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo
    })

    return { sent: true }
  } catch (err) {
    console.warn('[mail] Failed to send email:', err)
    return { sent: false, error: String(err) }
  }
}
