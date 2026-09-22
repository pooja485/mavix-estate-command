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
  if (env.NODE_ENV === 'production' && !process.env.EMAIL_PROVIDER_CONFIGURED) {
    logger.warn(
      { to, subject },
      'sendEmail() is still using the console-log stub in production — configure a real email provider (see src/utils/mailer.ts)'
    );
  }
  logger.info({ to, subject, html }, '📧 Email (stub — not actually sent, see src/utils/mailer.ts)');
}
