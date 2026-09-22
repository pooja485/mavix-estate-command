import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';
import { htmlSafeString } from '../../utils/sanitize';

const schema = z.object({
  date: z.string().min(1),
  customer: htmlSafeString(z.string().min(1)),
  unit: z.string().min(1),
  project: z.string().min(1),
  value: z.string().min(1),
  amount: z.string().min(1),
  exec: z.string().min(1),
  mode: z.string().min(1),
});

export default buildCrudRouter({ model: prisma.booking, createSchema: schema, orderBy: { createdAt: 'desc' } });
