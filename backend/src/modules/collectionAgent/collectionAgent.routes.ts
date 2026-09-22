import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';
import { requireAuth, tenantIdOf } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';

const schema = z.object({
  customer: z.string().min(1),
  unit: z.string().min(1),
  due: z.number().int().nonnegative(),
  days: z.number().int().nonnegative(),
  last: z.string().default(''),
  promise: z.string().default(''),
  risk: z.string().default('Low'),
});

const router = buildCrudRouter({ model: prisma.collectionAgentRecord, createSchema: schema, orderBy: { days: 'desc' } });

/** Simulates the AI collection agent running its reminder campaign, logging the run. */
router.post(
  '/run-followup',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantId = tenantIdOf(req);
    const records = await prisma.collectionAgentRecord.findMany({ where: { tenantId } });
    const totalDue = records.reduce((sum: number, r: { due: bigint }) => sum + Number(r.due), 0);
    await prisma.aiLog.create({
      data: {
        tenantId,
        time: new Date().toLocaleTimeString('en-IN'),
        module: 'Collection Agent',
        action: 'Campaign Run',
        entity: `${records.length} Customers`,
        result: `${records.length} reminders sent`,
        value: `₹${(totalDue / 100000).toFixed(2)}L total dues`,
      },
    });
    res.json({ data: { remindersSent: records.length, totalDue } });
  })
);

export default router;
