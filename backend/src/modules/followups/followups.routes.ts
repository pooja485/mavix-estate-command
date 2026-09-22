import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter, serialize } from '../../utils/crudFactory';
import { requireAuth, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  lead: z.string().min(1),
  customer: htmlSafeString(z.string().min(1)),
  phone: z.string().default(''),
  stage: z.string().default(''),
  date: z.string().min(1),
  type: z.string().min(1),
  exec: z.string().min(1),
  last: z.string().default(''),
  done: z.boolean().default(false),
});

const router = buildCrudRouter({ model: prisma.followup, createSchema: schema, orderBy: { date: 'asc' } });

router.post(
  '/:id/mark-done',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const existing = await prisma.followup.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) throw AppError.notFound();
    const updated = await prisma.followup.update({ where: { id: existing.id }, data: { done: true } });
    res.json({ data: serialize(updated) });
  })
);

export default router;
