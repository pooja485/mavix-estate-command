import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  name: htmlSafeString(z.string().min(1)),
  unit: z.string().min(1),
  project: z.string().min(1),
  agreement: z.number().int().nonnegative(),
  received: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  nextDemand: z.string().default(''),
  overdue: z.number().int().nonnegative().default(0),
  daysOD: z.number().int().nonnegative().default(0),
});

export default buildCrudRouter({ model: prisma.customer, createSchema: schema, orderBy: { name: 'asc' } });
