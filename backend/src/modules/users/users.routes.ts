import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, requireRole, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { sendEmail } from '../../utils/mailer';
import { htmlSafeString } from '../../utils/sanitize';

const router = Router();

const ADMIN_ROLES = ['SUPER_ADMIN', 'MANAGING_DIRECTOR'];

/** List teammates in the caller's own tenant. Any authenticated user can see the team roster. */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: users });
  })
);

const inviteSchema = z.object({
  name: htmlSafeString(z.string().min(1)),
  email: z.string().email(),
  role: z.enum([
    'SUPER_ADMIN', 'MANAGING_DIRECTOR', 'CFO', 'PROJECT_DIRECTOR', 'SALES_HEAD',
    'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'CRM_MANAGER', 'SITE_ENGINEER', 'EMPLOYEE',
  ]),
});

/**
 * Adds a teammate to the caller's tenant with a random temporary password,
 * emailed to them (or logged, via the mailer stub — see src/utils/mailer.ts).
 * Restricted to admin-level roles so a regular employee can't add accounts.
 */
router.post(
  '/',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const body = inviteSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: body.email.toLowerCase() } },
    });
    if (existing) throw AppError.conflict('A user with this email already exists in your workspace');

    const tempPassword = crypto.randomBytes(9).toString('base64url'); // 12-char random password
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

    const user = await prisma.user.create({
      data: { tenantId, name: body.name, email: body.email.toLowerCase(), passwordHash, role: body.role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await sendEmail(
      user.email,
      `You've been added to ${tenant.name} on MAVIX Estate Command`,
      `<p>Hi ${user.name},</p><p>You've been added to <strong>${tenant.name}</strong>'s workspace (<code>${tenant.slug}</code>).</p><p>Temporary password: <strong>${tempPassword}</strong></p><p>Log in and change it as soon as possible via your profile.</p>`
    );

    res.status(201).json({ data: user });
  })
);

const roleUpdateSchema = z.object({
  role: z.enum([
    'SUPER_ADMIN', 'MANAGING_DIRECTOR', 'CFO', 'PROJECT_DIRECTOR', 'SALES_HEAD',
    'PROJECT_MANAGER', 'ACCOUNTS_MANAGER', 'CRM_MANAGER', 'SITE_ENGINEER', 'EMPLOYEE',
  ]).optional(),
  isActive: z.boolean().optional(),
});

/** Change a teammate's role or activate/deactivate their account. Admin-only, same-tenant only. */
router.patch(
  '/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const body = roleUpdateSchema.parse(req.body);

    const target = await prisma.user.findFirst({ where: { id: req.params.id, tenantId } });
    if (!target) throw AppError.notFound();

    if (target.id === req.auth!.sub && body.isActive === false) {
      throw AppError.badRequest("You can't deactivate your own account");
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: body,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json({ data: updated });
  })
);

export default router;
