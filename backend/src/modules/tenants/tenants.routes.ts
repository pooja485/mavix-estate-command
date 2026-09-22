import { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { requireAuth, tenantIdOf } from '../../middleware/auth';

const router = Router();

/**
 * Platform-admin guard, DELIBERATELY separate from any per-tenant user role.
 * A tenant's own SUPER_ADMIN must never be able to list or manage *other*
 * clients' tenants — that would be a cross-tenant data leak. Only whoever
 * holds this operator secret (set PLATFORM_ADMIN_KEY, not committed) can.
 */
function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  const key = req.header('x-platform-admin-key');
  if (!process.env.PLATFORM_ADMIN_KEY || key !== process.env.PLATFORM_ADMIN_KEY) {
    throw AppError.forbidden('Platform admin access required');
  }
  next();
}

/** The caller's own tenant (self-service — any authenticated user). */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantIdOf(req) } });
    if (!tenant) throw AppError.notFound();
    res.json({ data: tenant });
  })
);

/**
 * Platform operator endpoints for onboarding/managing the multiple client
 * tenants this deployment serves. Restricted to SUPER_ADMIN users of a
 * designated "platform" tenant slug (set PLATFORM_TENANT_SLUG in env if
 * you want a real ops console; otherwise manage tenants via the DB/CLI).
 */
router.get(
  '/',
  requirePlatformAdmin,
  asyncHandler(async (_req, res) => {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, slug: true, status: true, createdAt: true, _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: tenants });
  })
);

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'TRIAL']) });

router.patch(
  '/:id/status',
  requirePlatformAdmin,
  asyncHandler(async (req, res) => {
    const body = statusSchema.parse(req.body);
    const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: { status: body.status } });
    res.json({ data: tenant });
  })
);

export default router;
