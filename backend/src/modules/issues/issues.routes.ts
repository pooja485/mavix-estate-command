import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter, serialize } from '../../utils/crudFactory';
import { requireAuth, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  title: htmlSafeString(z.string().min(1)),
  priority: z.string().default('Medium'),
  project: z.string().min(1),
  type: z.string().min(1),
  impact: z.number().int().nonnegative().default(0),
  delay: z.number().int().nonnegative().default(0),
  owner: htmlSafeString(z.string().min(1)),
  due: z.string().min(1),
  status: z.string().default('Open'),
});

const router = buildCrudRouter({ model: prisma.issue, createSchema: schema, orderBy: { createdAt: 'desc' } });

router.post(
  '/:id/resolve',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const existing = await prisma.issue.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) throw AppError.notFound();
    const updated = await prisma.issue.update({ where: { id: existing.id }, data: { status: 'Resolved' } });
    res.json({ data: serialize(updated) });
  })
);

export default router;
