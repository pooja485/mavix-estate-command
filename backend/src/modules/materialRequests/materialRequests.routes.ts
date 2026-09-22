import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter, serialize } from '../../utils/crudFactory';
import { requireAuth, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  material: htmlSafeString(z.string().min(1)),
  qty: z.number().int().positive(),
  unit: z.string().min(1),
  project: z.string().min(1),
  requestedBy: z.string().min(1),
  status: z.string().default('Pending'),
});

const router = buildCrudRouter({ model: prisma.materialRequest, createSchema: schema, orderBy: { createdAt: 'desc' } });

router.post(
  '/:id/approve',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const existing = await prisma.materialRequest.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) throw AppError.notFound();
    const updated = await prisma.materialRequest.update({ where: { id: existing.id }, data: { status: 'Approved' } });
    res.json({ data: serialize(updated) });
  })
);

export default router;
