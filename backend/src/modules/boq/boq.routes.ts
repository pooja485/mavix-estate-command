import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { buildCrudRouter } from '../../utils/crudFactory';

const schema = z.object({
  code: z.string().min(1),
  cat: z.string().min(1),
  budget: z.number().int().nonnegative(),
  committed: z.number().int().nonnegative(),
  actual: z.number().int().nonnegative(),
  paid: z.number().int().nonnegative(),
  remaining: z.number().int(),
  variance: z.number().int(),
  status: z.string().default('On Budget'),
});

export default buildCrudRouter({ model: prisma.boqItem, createSchema: schema, orderBy: { code: 'asc' } });
