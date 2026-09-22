import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/jwt';

/**
 * requireAuth verifies the Bearer access token and attaches
 * req.auth = { sub, tenantId, tenantSlug, role, email }.
 *
 * Every downstream route MUST scope all database reads/writes by
 * req.auth.tenantId — this is the entire multi-tenant isolation
 * boundary for the "shared DB, tenantId column" strategy.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    next();
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }
}

/** requireRole restricts a route to one or more roles. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw AppError.unauthorized();
    if (!roles.includes(req.auth.role)) {
      throw AppError.forbidden(`Requires one of roles: ${roles.join(', ')}`);
    }
    next();
  };
}

/** Convenience accessor — throws if somehow called without auth (should never happen after requireAuth). */
export function tenantIdOf(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.tenantId;
}
