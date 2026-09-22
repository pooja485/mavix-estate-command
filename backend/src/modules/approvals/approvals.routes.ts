import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter, serialize } from '../../utils/crudFactory';
import { requireAuth, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  code: z.string().min(1),
  type: z.string().min(1),
  desc: htmlSafeString(z.string().min(1)),
  amount: z.string().min(1),
  icon: z.string().default('📄'),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  project: z.string().min(1),
  raisedBy: htmlSafeString(z.string().min(1)),
  date: z.string().min(1),
});

const router = buildCrudRouter({ model: prisma.approval, createSchema: schema, orderBy: { createdAt: 'desc' } });

async function resolve(req: any, status: 'approved' | 'rejected') {
  const tenantId = tenantIdOf(req);
  const existing = await prisma.approval.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw AppError.notFound();
  const [updated] = await prisma.$transaction([
    prisma.approval.update({ where: { id: existing.id }, data: { status } }),
    prisma.auditLog.create({
      data: {
        tenantId,
        user: req.auth.email,
        role: req.auth.role,
        module: 'Approvals',
        action: status === 'approved' ? 'Approved' : 'Rejected',
        desc: `${existing.type} — ${existing.desc} (${existing.amount})`,
      },
    }),
  ]);
  return updated;
}

router.post(
  '/:id/approve',
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await resolve(req, 'approved');
    res.json({ data: serialize(updated) });
  })
);

router.post(
  '/:id/reject',
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await resolve(req, 'rejected');
    res.json({ data: serialize(updated) });
  })
);

export default router;
