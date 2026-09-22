import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter, serialize } from '../../utils/crudFactory';
import { requireAuth, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  code: z.string().min(1),
  title: htmlSafeString(z.string().min(1)),
  emp: z.string().min(1),
  dept: z.string().min(1),
  project: z.string().min(1),
  due: z.string().min(1),
  priority: z.string().default('Medium'),
  status: z.string().default('Assigned'),
  update: z.string().default(''),
});

const router = buildCrudRouter({ model: prisma.task, createSchema: schema, orderBy: { due: 'asc' } });

router.post(
  '/:id/mark-done',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const existing = await prisma.task.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) throw AppError.notFound();
    const updated = await prisma.task.update({ where: { id: existing.id }, data: { status: 'Completed' } });
    res.json({ data: serialize(updated) });
  })
);

export default router;
