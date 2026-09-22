import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter, serialize } from '../../utils/crudFactory';
import { requireAuth, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  cat: z.string().min(1),
  title: htmlSafeString(z.string().min(1)),
  body: htmlSafeString(z.string()).default(''),
  unread: z.boolean().default(true),
});

const router = buildCrudRouter({ model: prisma.notification, createSchema: schema, orderBy: { createdAt: 'desc' } });

router.post(
  '/:id/mark-read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const existing = await prisma.notification.findFirst({ where: { id: req.params.id, tenantId } });
    if (!existing) throw AppError.notFound();
    const updated = await prisma.notification.update({ where: { id: existing.id }, data: { unread: false } });
    res.json({ data: serialize(updated) });
  })
);

router.post(
  '/mark-all-read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    await prisma.notification.updateMany({ where: { tenantId, unread: true }, data: { unread: false } });
    res.status(204).send();
  })
);

export default router;
