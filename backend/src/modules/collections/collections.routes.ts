import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  date: z.string().min(1),
  customer: z.string().min(1),
  unit: z.string().min(1),
  project: z.string().min(1),
  type: z.string().min(1),
  amount: z.number().int().nonnegative(),
  mode: z.string().min(1),
  ref: z.string().default(''),
  status: z.string().default('Cleared'),
});

export default buildCrudRouter({ model: prisma.collection, createSchema: schema, orderBy: { createdAt: 'desc' } });
