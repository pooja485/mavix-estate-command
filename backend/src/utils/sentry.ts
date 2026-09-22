import { env } from '../config/env';
import { logger } from './logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null;

/**
 * Initializes Sentry error tracking if SENTRY_DSN is configured. Completely
 * optional — the app runs identically without it, just with errors only
 * visible in your own logs instead of also being reported to Sentry's
 * dashboard (with stack traces, request context, and alerting).
 *
 * To enable: sign up at sentry.io, create a Node.js project, copy its DSN
 * into your .env as SENTRY_DSN, and restart the backend.
 */
export function initSentry(): void {
  if (!env.SENTRY_DSN) {
    logger.info('SENTRY_DSN not set — error tracking disabled (this is fine for local dev)');
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Sentry = require('@sentry/node');
    Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, tracesSampleRate: 0.1 });
    logger.info('Sentry error tracking initialized');
  } catch (err) {
    logger.warn({ err }, '@sentry/node not installed — run `npm install` to enable error tracking');
  }
}

export function captureException(err: unknown): void {
  if (Sentry) Sentry.captureException(err);
}
