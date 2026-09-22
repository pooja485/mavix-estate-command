import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { requireAuth } from '../../middleware/auth';
import { env } from '../../config/env';
import { sendEmail } from '../../utils/mailer';

const router = Router();

const signupSchema = z.object({
  companyName: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and dashes only'),
  adminName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * Onboards a brand-new client (tenant) with its first admin user.
 * This is how "we give this project to multiple clients" works operationally:
 * each client gets their own Tenant row + isolated data, all on the same
 * deployed backend/database.
 */
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const body = signupSchema.parse(req.body);

    const existingSlug = await prisma.tenant.findUnique({ where: { slug: body.slug } });
    if (existingSlug) throw AppError.conflict('That company slug is already taken');

    const passwordHash = await bcrypt.hash(body.password, 12);

    const tenant = await prisma.tenant.create({
      data: {
        name: body.companyName,
        slug: body.slug,
        status: 'TRIAL',
        users: {
          create: {
            name: body.adminName,
            email: body.email.toLowerCase(),
            passwordHash,
            role: 'SUPER_ADMIN',
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];
    const { accessToken, refreshToken } = await issueTokens(user.id, tenant.id, tenant.slug, user.role, user.email);

    res.status(201).json({
      data: {
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  })
);

const loginSchema = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } });
    if (!tenant || tenant.status === 'SUSPENDED') throw AppError.unauthorized('Invalid credentials');

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: body.email.toLowerCase() } },
    });
    if (!user || !user.isActive) throw AppError.unauthorized('Invalid credentials');

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw AppError.unauthorized('Invalid credentials');

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const { accessToken, refreshToken } = await issueTokens(user.id, tenant.id, tenant.slug, user.role, user.email);

    res.json({
      data: {
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  })
);

const refreshSchema = z.object({ refreshToken: z.string().min(1) });

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);

    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Invalid refresh token');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token expired or revoked');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { tenant: true } });
    if (!user || !user.isActive) throw AppError.unauthorized('Invalid refresh token');

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const tokens = await issueTokens(user.id, user.tenantId, user.tenant.slug, user.role, user.email);

    res.json({ data: tokens });
  })
);

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = refreshSchema.safeParse(req.body);
    if (body.success) {
      const tokenHash = hashToken(body.data.refreshToken);
      await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
    }
    res.status(204).send();
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.sub }, include: { tenant: true } });
    if (!user) throw AppError.notFound();
    res.json({
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug, status: user.tenant.status },
      },
    });
  })
);

async function issueTokens(userId: string, tenantId: string, tenantSlug: string, role: string, email: string) {
  const accessToken = signAccessToken({ sub: userId, tenantId, tenantSlug, role, email });
  const refreshToken = signRefreshToken(userId);
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken, refreshToken };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================
// PASSWORD RESET
// ============================================================

const forgotPasswordSchema = z.object({
  tenantSlug: z.string().min(1),
  email: z.string().email(),
});

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const body = forgotPasswordSchema.parse(req.body);

    // Always respond with the same generic message whether or not the
    // account exists — this prevents attackers from using this endpoint
    // to discover which email addresses are registered.
    const genericResponse = { data: { message: 'If that account exists, a reset link has been sent.' } };

    const tenant = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } });
    if (!tenant) return res.json(genericResponse);

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: body.email.toLowerCase() } },
    });
    if (!user || !user.isActive) return res.json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }, // 1 hour
    });

    // In a real deployment this URL should point at your actual frontend host.
    const resetUrl = `${env.CORS_ORIGINS.split(',')[0]}/reset-password.html?token=${rawToken}&tenant=${tenant.slug}`;
    await sendEmail(
      user.email,
      'Reset your MAVIX Estate Command password',
      `<p>Hi ${user.name},</p><p>Click below to reset your password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`
    );

    res.json(genericResponse);
  })
);

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  tenantSlug: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const body = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(body.token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { tenant: true } } },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date() ||
      resetToken.user.tenant.slug !== body.tenantSlug
    ) {
      throw AppError.badRequest('This reset link is invalid or has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      // Revoke all existing refresh tokens — a password reset should log the user out everywhere.
      prisma.refreshToken.updateMany({ where: { userId: resetToken.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    res.json({ data: { message: 'Password updated. Please log in with your new password.' } });
  })
);

export default router;
