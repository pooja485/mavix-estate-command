import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter, serialize } from '../../utils/crudFactory';
import { requireAuth, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  code: z.string().min(1),
  name: htmlSafeString(z.string().min(1)),
  phone: htmlSafeString(z.string().min(1)),
  email: z.string().email().or(z.literal('')),
  source: z.string().min(1),
  project: z.string().min(1),
  budget: htmlSafeString(z.string().min(1)),
  type: z.string().min(1),
  timeline: z.string().min(1),
  score: z.number().int().min(0).max(100).default(0),
  exec: z.string().min(1),
  last: z.string().min(1),
  next: z.string().min(1),
  stage: z.string().default('New'),
  status: z.string().default('Active'),
});

const router = buildCrudRouter({ model: prisma.lead, createSchema: schema, orderBy: { createdAt: 'desc' } });

const STAGES = ['New', 'Contacted', 'Qualified', 'Site Visit', 'Negotiation', 'Booking', 'Lost'];

router.post(
  '/:id/advance-stage',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId } });
    if (!lead) throw AppError.notFound();
    const idx = STAGES.indexOf(lead.stage);
    const nextStage = idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1] : lead.stage;
    const updated = await prisma.lead.update({ where: { id: lead.id }, data: { stage: nextStage } });
    res.json({ data: serialize(updated) });
  })
);

export default router;
