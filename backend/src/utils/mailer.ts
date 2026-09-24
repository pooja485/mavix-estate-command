import { logger } from './logger';
import { env } from '../config/env';

/**
 * Sends transactional email. Out of the box this just logs the message —
 * good enough for local dev and for verifying the password-reset flow
 * end-to-end without needing real email credentials.
 *
 * For production, replace the body of this function with a real provider.
 * Two common options:
 *
 *   1) Nodemailer + SMTP (Gmail, SES, Mailgun, your own mail server):
 *        npm install nodemailer
 *        import nodemailer from 'nodemailer';
 *        const transport = nodemailer.createTransport({ host, port, auth });
 *        await transport.sendMail({ from, to, subject, html });
 *
 *   2) A transactional email API (SendGrid, Resend, Postmark) — usually a
 *      single fetch() call to their REST API with an API key from env.
 *
 * Either way, keep the same `sendEmail(to, subject, html)` signature so
 * nothing else in the codebase needs to change.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === 'production') {
      logger.warn(
        { to, subject },
        'sendEmail() is still using the console-log stub in production — set RESEND_API_KEY to send real email'
      );
    }
    logger.info({ to, subject, html }, '📧 Email (stub — not actually sent, see src/utils/mailer.ts)');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error({ to, subject, status: res.status, body }, 'Resend email send failed');
    // Don't throw — a failed email (e.g. password reset) shouldn't crash the request
    // that triggered it. The generic caller-facing message stays the same either way.
    return;
  }

  logger.info({ to, subject }, '📧 Email sent via Resend');
}